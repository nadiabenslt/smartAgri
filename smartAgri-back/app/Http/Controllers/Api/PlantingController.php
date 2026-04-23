<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Planting\PlantingRequest;
use App\Models\Planting;
use App\Services\GroqService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PlantingController extends Controller
{
    /**
     * How many days per AI chunk.
     * Keeping this small (10) forces Groq to generate EVERY day without skipping.
     */
    private const CHUNK_SIZE = 10;

    // GET /api/plantings
    public function index()
    {
        $plantings = Planting::whereHas('surface', function ($q) {
                $q->where('user_id', auth()->id());
            })
            ->with(['surface', 'plante'])
            ->get();

        return response()->json(['plantings' => $plantings]);
    }

    // POST /api/plantings
    public function store(PlantingRequest $request, GroqService $groqService)
    {
        // ── Step 1: Create planting ───────────────────────────────────────────
        $planting = Planting::create([
            'surface_id' => $request->surface_id,
            'plante_id'  => $request->plante_id,
            'quantity'   => $request->quantity,
            'start_date' => $request->start_date,
            'end_date'   => null,
            'status'     => $request->status ?? 'pending',
        ]);

        $planting->load(['surface', 'plante']);

        if (! $planting->plante) {
            $planting->delete();
            return response()->json([
                'message' => 'Planting aborted: plante_id ' . $request->plante_id . ' was not found.',
            ], 422);
        }

        if (! $planting->surface) {
            $planting->delete();
            return response()->json([
                'message' => 'Planting aborted: surface_id ' . $request->surface_id . ' was not found.',
            ], 422);
        }

        $programmesCreated   = [];
        $aiPredictedDuration = null;
        $aiPredictedEndDate  = null;

        try {
            $startDate    = Carbon::parse($planting->start_date);
            $plantName    = $planting->plante->name;
            $soilType     = $planting->surface->soil_type;
            $season       = $this->getSeason($startDate);
            $fallbackDays = $planting->plante->growth_duration ?? 30;

            // ── Step 2: Fetch OWM 5-day forecast ─────────────────────────────
            $weatherSummary = $this->getOWMForecast(
                $request->input('lat'),
                $request->input('lon')
            );
            $weatherForecast = $weatherSummary['forecast']; // indexed array of daily data

            // ── Step 3: Phase A — Ask AI for growth duration ONLY ────────────
            //    (Small, focused call so Groq doesn't get distracted by scheduling)
            $aiPredictedDuration = $this->predictGrowthDuration(
                $groqService, $plantName, $soilType, $season,
                $fallbackDays, $weatherSummary
            );

            $aiPredictedEndDate = $startDate->copy()->addDays($aiPredictedDuration)->toDateString();

            $planting->update(['end_date' => $aiPredictedEndDate]);

            // ── Step 4: Phase B — Generate programme in chunks of CHUNK_SIZE ─
            //    Chunking forces the AI to produce EVERY day, no skipping.
            $chunks = array_chunk(range(1, $aiPredictedDuration), self::CHUNK_SIZE);

            foreach ($chunks as $chunk) {
                $fromDay = $chunk[0];
                $toDay   = end($chunk);

                // Build weather lines only for days in this chunk
                $chunkWeather = $this->weatherLinesForRange($weatherForecast, $fromDay, $toDay, $startDate);

                $days = $this->generateChunk(
                    $groqService,
                    $plantName,
                    $soilType,
                    $season,
                    $fromDay,
                    $toDay,
                    $chunkWeather
                );

                foreach ($days as $day) {
                    if (
                        isset($day['day_number'], $day['recommendations'])
                        && is_array($day['recommendations'])
                        && (int) $day['day_number'] >= $fromDay
                        && (int) $day['day_number'] <= $toDay
                    ) {
                        $programmesCreated[] = $planting->programmes()->create([
                            'day_number'      => $day['day_number'],
                            'date'            => $startDate->copy()->addDays($day['day_number'] - 1)->toDateString(),
                            'weather_summary' => $day['weather_summary'] ?? null,
                            'recommendations' => $day['recommendations'],
                            'status'          => 'pending',
                        ]);
                    }
                }
            }

        } catch (\Exception $e) {
            Log::error('Planting store error: ' . $e->getMessage());
            $this->fallbackEndDate($planting, $planting->plante->growth_duration ?? 30);
        }

        return response()->json([
            'message'               => 'Planting created successfully',
            'planting'              => $planting->fresh(['surface', 'plante']),
            'ai_predicted_duration' => $aiPredictedDuration,
            'ai_predicted_end_date' => $aiPredictedEndDate,
            'total_days_generated'  => count($programmesCreated),
            'programme'             => $programmesCreated,
        ], 201);
    }

    // GET /api/plantings/{id}
    public function show($id)
    {
        $planting = Planting::whereHas('surface', function ($q) {
                $q->where('user_id', auth()->id());
            })
            ->with(['surface', 'plante', 'programmes'])
            ->findOrFail($id);

        return response()->json(['planting' => $planting]);
    }

    // PUT /api/plantings/{id}
    public function update(PlantingRequest $request, $id)
    {
        $planting = Planting::whereHas('surface', function ($q) {
                $q->where('user_id', auth()->id());
            })
            ->findOrFail($id);

        $planting->update([
            'surface_id' => $request->surface_id,
            'plante_id'  => $request->plante_id,
            'quantity'   => $request->quantity,
            'start_date' => $request->start_date,
            'end_date'   => $request->end_date ?? $planting->end_date,
            'status'     => $request->status   ?? $planting->status,
        ]);

        return response()->json([
            'message'  => 'Planting updated successfully',
            'planting' => $planting->load(['surface', 'plante']),
        ]);
    }

    // DELETE /api/plantings/{id}
    public function destroy($id)
    {
        $planting = Planting::whereHas('surface', function ($q) {
                $q->where('user_id', auth()->id());
            })
            ->findOrFail($id);

        $planting->delete();

        return response()->json(['message' => 'Planting deleted successfully']);
    }

    // =========================================================================
    // AI helpers
    // =========================================================================

    /**
     * Phase A: ask Groq ONLY for the predicted growth duration.
     * Keeping this separate avoids Groq trying to schedule AND count at once.
     */
    private function predictGrowthDuration(
        GroqService $groqService,
        string $plantName,
        string $soilType,
        string $season,
        int $fallbackDays,
        array $weatherSummary
    ): int {
        $weatherLine = $weatherSummary['available']
            ? $this->formatWeatherForPrompt($weatherSummary['forecast'])
            : "No forecast — assume typical {$season} conditions.";

        $prompt = <<<PROMPT
You are an agronomist. Given the data below, return ONLY a JSON object with a single key "duration_days" (integer).
No explanation, no markdown, no extra keys.

Plant: {$plantName}
Soil: {$soilType}
Season: {$season}
Weather forecast:
{$weatherLine}
Database fallback duration: {$fallbackDays} days

Example response: {"duration_days": 45}
PROMPT;

        try {
            $response = $groqService->ask($prompt, 'Respond ONLY with a valid JSON object. No markdown, no text.');
            $clean    = preg_replace('/```json|```/', '', $response);
            $result   = json_decode(trim($clean), true);

            $duration = (int) ($result['duration_days'] ?? 0);
            return $duration > 0 ? $duration : $fallbackDays;
        } catch (\Exception $e) {
            Log::warning('Growth duration prediction failed: ' . $e->getMessage());
            return $fallbackDays;
        }
    }

    /**
     * Phase B: generate care recommendations for a specific day range.
     *
     * The prompt explicitly lists every day number that MUST appear in the output,
     * so Groq cannot skip or summarize.
     *
     * @return array  Array of day objects: [{day_number, weather_summary, recommendations}]
     */
    private function generateChunk(
        GroqService $groqService,
        string $plantName,
        string $soilType,
        string $season,
        int $fromDay,
        int $toDay,
        string $weatherLines
    ): array {
        // Build the explicit day list so the AI knows exactly what to produce
        $dayList = implode(', ', range($fromDay, $toDay));
        $count   = $toDay - $fromDay + 1;

        $systemPrompt = <<<SYSTEM
You are an expert agronomist. You generate precise daily care schedules for crops.
CRITICAL RULES — you MUST follow these exactly:
1. Return a JSON array of EXACTLY {$count} objects — one for EACH of these days: {$dayList}.
2. Every day_number from {$fromDay} to {$toDay} must appear. NO skipping, NO merging days.
3. Adapt recommendations to the weather provided for that specific day.
4. If rain > 5mm: reduce or skip watering and say why.
5. If temp > 35°C: add heat-stress tip. If temp < 5°C: add frost protection.
6. Respond ONLY with a valid JSON array. No markdown, no explanation, no extra text.
SYSTEM;

        $prompt = <<<PROMPT
Plant: {$plantName}
Soil: {$soilType}
Season: {$season}

Weather for days {$fromDay}–{$toDay}:
{$weatherLines}

Generate EXACTLY {$count} entries — one per day — for day numbers: {$dayList}.
Do NOT skip any day. Do NOT merge days. Every day_number must appear exactly once.

Each entry must follow this structure:
{
  "day_number": <integer between {$fromDay} and {$toDay}>,
  "weather_summary": "<short weather description for this day>",
  "recommendations": [
    { "type": "watering",     "description": "<specific instruction>" },
    { "type": "observation",  "description": "<what to check>" }
  ]
}

Return ONLY the JSON array. Start with [ and end with ].
PROMPT;

        try {
            $response = $groqService->ask($prompt, $systemPrompt);
            $clean    = preg_replace('/```json|```/', '', $response);

            // Extract JSON array even if there's stray text
            preg_match('/\[.*\]/s', trim($clean), $matches);
            $days = json_decode($matches[0] ?? '[]', true);

            if (! is_array($days)) {
                Log::warning("Chunk {$fromDay}-{$toDay} parse failed", ['raw' => $response]);
                return $this->fallbackChunk($fromDay, $toDay);
            }

            // Verify completeness — fill any missing days with a fallback entry
            $produced = array_column($days, 'day_number');
            for ($d = $fromDay; $d <= $toDay; $d++) {
                if (! in_array($d, $produced)) {
                    Log::warning("Groq skipped day {$d} in chunk {$fromDay}-{$toDay}, filling with fallback.");
                    $days[] = $this->fallbackDay($d, $season);
                }
            }

            return $days;

        } catch (\Exception $e) {
            Log::error("Chunk {$fromDay}-{$toDay} generation failed: " . $e->getMessage());
            return $this->fallbackChunk($fromDay, $toDay);
        }
    }

    /**
     * Build a weather text block for a specific day range within the forecast.
     * Days beyond the forecast window get a seasonal note.
     */
    private function weatherLinesForRange(
        array $forecast,
        int $fromDay,
        int $toDay,
        Carbon $startDate
    ): string {
        $lines = [];
        for ($d = $fromDay; $d <= $toDay; $d++) {
            $idx = $d - 1; // forecast is 0-indexed
            if (isset($forecast[$idx])) {
                $f       = $forecast[$idx];
                $lines[] = sprintf(
                    'Day %d (%s): %s, max %.1f°C / min %.1f°C, rain %.1fmm',
                    $d,
                    $f['date'],
                    ucfirst($f['condition']),
                    $f['temp_max'],
                    $f['temp_min'],
                    $f['rain_mm']
                );
            } else {
                $date    = $startDate->copy()->addDays($d - 1)->toDateString();
                $lines[] = "Day {$d} ({$date}): No forecast data — use seasonal averages.";
            }
        }
        return implode("\n", $lines);
    }

    /**
     * Fallback: generate a basic entry for every day in a range without AI.
     */
    private function fallbackChunk(int $fromDay, int $toDay): array
    {
        $days = [];
        for ($d = $fromDay; $d <= $toDay; $d++) {
            $days[] = $this->fallbackDay($d, 'unknown');
        }
        return $days;
    }

    /**
     * Produce a minimal valid day entry when AI fails or skips.
     */
    private function fallbackDay(int $dayNumber, string $season): array
    {
        return [
            'day_number'      => $dayNumber,
            'weather_summary' => 'No forecast available',
            'recommendations' => [
                ['type' => 'watering',    'description' => 'Water moderately based on soil moisture.'],
                ['type' => 'observation', 'description' => 'Check plant health and soil condition.'],
            ],
        ];
    }

    // =========================================================================
    // Weather helpers
    // =========================================================================

    /**
     * Fetch a 5-day / 3-hour forecast from OpenWeatherMap and collapse to daily.
     */
    private function getOWMForecast(?float $lat, ?float $lon): array
    {
        if ($lat === null || $lon === null) {
            return ['available' => false, 'forecast' => []];
        }

        try {
            $apiKey   = config('services.openweathermap.key');
            $response = Http::timeout(8)->get('https://api.openweathermap.org/data/2.5/forecast', [
                'lat'   => $lat,
                'lon'   => $lon,
                'units' => 'metric',
                'appid' => $apiKey,
            ]);

            if (! $response->ok()) {
                return ['available' => false, 'forecast' => []];
            }

            $list  = $response->json()['list'] ?? [];
            $byDay = [];

            foreach ($list as $slot) {
                $date = Carbon::createFromTimestamp($slot['dt'])->toDateString();
                $hour = Carbon::createFromTimestamp($slot['dt'])->hour;

                if (! isset($byDay[$date]) || abs($hour - 12) < abs(Carbon::parse($byDay[$date]['_h'])->hour - 12)) {
                    $byDay[$date] = [
                        '_h'        => Carbon::createFromTimestamp($slot['dt'])->toDateTimeString(),
                        'date'      => $date,
                        'temp_max'  => $slot['main']['temp_max'],
                        'temp_min'  => $slot['main']['temp_min'],
                        'rain_mm'   => $slot['rain']['3h'] ?? 0,
                        'condition' => $slot['weather'][0]['description'] ?? 'unknown',
                    ];
                }
            }

            $forecast = array_values(array_map(function ($d) {
                unset($d['_h']);
                return $d;
            }, $byDay));

            return ['available' => true, 'forecast' => $forecast];

        } catch (\Exception $e) {
            Log::warning('OWM fetch failed: ' . $e->getMessage());
            return ['available' => false, 'forecast' => []];
        }
    }

    private function formatWeatherForPrompt(array $forecast): string
    {
        $lines = [];
        foreach ($forecast as $i => $day) {
            $lines[] = sprintf(
                'Day %d (%s): %s, max %.1f°C / min %.1f°C, rain %.1fmm',
                $i + 1, $day['date'], ucfirst($day['condition']),
                $day['temp_max'], $day['temp_min'], $day['rain_mm']
            );
        }
        return implode("\n", $lines);
    }

    // =========================================================================
    // Misc helpers
    // =========================================================================

    private function getSeason(Carbon $date): string
    {
        return match (true) {
            in_array($date->month, [3, 4, 5])   => 'Spring',
            in_array($date->month, [6, 7, 8])   => 'Summer',
            in_array($date->month, [9, 10, 11]) => 'Autumn',
            default                              => 'Winter',
        };
    }

    private function fallbackEndDate(Planting $planting, int $days): void
    {
        $planting->update([
            'end_date' => Carbon::parse($planting->start_date)->addDays($days)->toDateString(),
        ]);
    }
}

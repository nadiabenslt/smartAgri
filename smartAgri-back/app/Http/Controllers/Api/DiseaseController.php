<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanteMaladie;
use App\Models\Programme;
use App\Services\GroqService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DiseaseController extends Controller
{
    /**
     * GET /api/diseases
     * List all diseases for the authenticated user.
     */
    public function index(Request $request)
    {
        $diseases = PlanteMaladie::where('user_id', $request->user()->id)
            ->with(['programmes' => fn($q) => $q->orderBy('day_number')])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success'  => true,
            'diseases' => $diseases,
        ]);
    }

    /**
     * GET /api/diseases/{id}
     * Show a single disease with its treatment programmes.
     */
    public function show(Request $request, $id)
    {
        $disease = PlanteMaladie::where('user_id', $request->user()->id)
            ->with(['programmes' => fn($q) => $q->orderBy('day_number')])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'disease' => $disease,
        ]);
    }

    /**
     * POST /api/diseases/analyze
     * Analyze symptoms, save disease to DB, generate 7-day treatment programme.
     */
    public function analyze(Request $request, GroqService $groqService)
    {
        $request->validate([
            'description' => 'required|string|min:5',
            'plant_name'  => 'nullable|string',
            'image'       => 'nullable|string', // Base64 image
        ]);

        $plantName   = $request->input('plant_name', 'unknown plant');
        $description = $request->input('description');
        $imageBase64 = $request->input('image');
        $userId      = $request->user()->id;

        // ── Step 1: AI diagnosis ──────────────────────────────────────────
        $diagnosisPrompt = <<<PROMPT
I have a {$plantName} plant and I noticed the following symptoms:
"{$description}"

Please analyze these symptoms and provide:
1. The most likely disease or problem name
2. A brief description of the disease
3. The severity level (low, medium, high, critical)
4. Recommended treatment steps (as a numbered list)
5. Prevention tips for the future

Respond ONLY with a valid JSON object in this exact format:
{
  "disease_name": "...",
  "description": "...",
  "severity": "low|medium|high|critical",
  "treatments": ["step 1", "step 2"],
  "prevention": ["tip 1", "tip 2"],
  "confidence": 85
}
PROMPT;

        try {
            $aiResponse = $groqService->ask(
                $diagnosisPrompt,
                'You are an expert agricultural plant pathologist. Analyze plant disease symptoms and provide accurate, actionable diagnoses. Respond ONLY with valid JSON.',
                $imageBase64
            );

            $cleaned = preg_replace('/```json\s*|\s*```/', '', trim($aiResponse));
            $diagnosis = json_decode($cleaned, true);

            if (!$diagnosis || !isset($diagnosis['disease_name'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Could not parse AI diagnosis.',
                    'raw'     => $aiResponse,
                ], 422);
            }

            // ── Step 2: Save disease to database ───────────────────────────
            $disease = PlanteMaladie::create([
                'user_id'         => $userId,
                'name'            => $diagnosis['disease_name'],
                'plant_name'      => $plantName,
                'description'     => $diagnosis['description'] ?? '',
                'symptoms'        => $description,
                'severity'        => $diagnosis['severity'] ?? 'low',
                'confidence'      => $diagnosis['confidence'] ?? 0,
                'treatments'      => $diagnosis['treatments'] ?? [],
                'prevention'      => $diagnosis['prevention'] ?? [],
                'detected_at'     => Carbon::today(),
                'treated'         => false,
                'analysis_status' => 'active',
                'follow_up_date'  => Carbon::today()->addDays(7),
            ]);

            // ── Step 3: Generate 7-day treatment programme via AI ──────────
            $this->generateTreatmentProgramme($groqService, $disease, $plantName);

            // Reload with programmes
            $disease->load(['programmes' => fn($q) => $q->orderBy('day_number')]);

            return response()->json([
                'success' => true,
                'disease' => $disease,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Analysis failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/diseases/{id}/follow-up
     * User re-describes plant condition after treatment week.
     * AI evaluates if resolved or generates another programme.
     */
    public function followUp(Request $request, GroqService $groqService, $id)
    {
        $request->validate([
            'description' => 'required|string|min:5',
            'image'       => 'nullable|string', // Base64 image
        ]);

        $disease = PlanteMaladie::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $newDescription = $request->input('description');
        $imageBase64    = $request->input('image');

        $prompt = <<<PROMPT
Previously, a {$disease->plant_name} plant was diagnosed with "{$disease->name}".
Original symptoms: "{$disease->symptoms}"

After 7 days of treatment, the user describes the plant's current condition:
"{$newDescription}"

Based on this follow-up, determine:
1. Is the disease resolved, improving, or still present?
2. If resolved: confirm the treatment worked
3. If not resolved: provide an updated 7-day treatment programme

Respond ONLY with valid JSON:
{
  "status": "resolved|improving|not_resolved",
  "assessment": "Brief assessment of current condition",
  "confidence": 80
}
PROMPT;

        try {
            $aiResponse = $groqService->ask(
                $prompt,
                'You are an expert agricultural plant pathologist doing a follow-up assessment. Respond ONLY with valid JSON.',
                $imageBase64
            );

            $cleaned = preg_replace('/```json\s*|\s*```/', '', trim($aiResponse));
            $assessment = json_decode($cleaned, true);

            if (!$assessment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Could not parse AI follow-up response.',
                ], 422);
            }

            $aiStatus = $assessment['status'] ?? 'not_resolved';

            if ($aiStatus === 'resolved') {
                // Mark disease as treated/resolved
                $disease->update([
                    'treated'         => true,
                    'analysis_status' => 'resolved',
                ]);

                return response()->json([
                    'success'    => true,
                    'resolved'   => true,
                    'assessment' => $assessment,
                    'disease'    => $disease,
                ]);
            }

            // Disease not resolved — generate another 7-day programme
            $disease->update([
                'analysis_status' => 'active',
                'symptoms'        => $newDescription,
                'follow_up_date'  => Carbon::today()->addDays(7),
            ]);

            // Delete old pending programmes and generate new ones
            $disease->programmes()->where('status', 'pending')->delete();
            $this->generateTreatmentProgramme($groqService, $disease, $disease->plant_name);

            $disease->load(['programmes' => fn($q) => $q->orderBy('day_number')]);

            return response()->json([
                'success'    => true,
                'resolved'   => false,
                'assessment' => $assessment,
                'disease'    => $disease,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Follow-up failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate a 7-day treatment programme for a disease via AI.
     */
    private function generateTreatmentProgramme(GroqService $groqService, PlanteMaladie $disease, string $plantName): void
    {
        $treatmentsList = is_array($disease->treatments) ? implode(', ', $disease->treatments) : $disease->treatments;

        $prompt = <<<PROMPT
Create a detailed 7-day treatment programme for a {$plantName} plant diagnosed with "{$disease->name}".
Disease description: "{$disease->description}"
Recommended treatments: {$treatmentsList}

For each day (1-7), provide specific tasks the farmer should do. Include watering adjustments, medication application, monitoring steps, etc.

Respond ONLY with a valid JSON array of 7 objects:
[
  {
    "day": 1,
    "title": "Day 1 - Initial Treatment",
    "tasks": ["task 1", "task 2", "task 3"]
  },
  {
    "day": 2,
    "title": "Day 2 - ...",
    "tasks": ["task 1", "task 2"]
  }
]
PROMPT;

        try {
            $response = $groqService->ask(
                $prompt,
                'You are an expert agricultural advisor creating daily treatment schedules. Respond ONLY with a valid JSON array.'
            );

            $cleaned = preg_replace('/```json\s*|\s*```/', '', trim($response));
            $days = json_decode($cleaned, true);

            if (!is_array($days)) {
                // Fallback: create basic 7-day programme
                $days = [];
                for ($i = 1; $i <= 7; $i++) {
                    $days[] = [
                        'day'   => $i,
                        'title' => "Day {$i} - Treatment",
                        'tasks' => ['Apply recommended treatment', 'Monitor plant condition', 'Water appropriately'],
                    ];
                }
            }

            $startDate = Carbon::today();

            foreach ($days as $dayData) {
                $dayNum = $dayData['day'] ?? 1;
                Programme::create([
                    'programmable_id'   => $disease->id,
                    'programmable_type' => PlanteMaladie::class,
                    'day_number'        => $dayNum,
                    'date'              => $startDate->copy()->addDays($dayNum - 1),
                    'recommendations'   => [
                        'title' => $dayData['title'] ?? "Day {$dayNum}",
                        'tasks' => $dayData['tasks'] ?? [],
                    ],
                    'status' => 'pending',
                ]);
            }
        } catch (\Exception $e) {
            // If AI fails, create fallback programme
            $startDate = Carbon::today();
            for ($i = 1; $i <= 7; $i++) {
                Programme::create([
                    'programmable_id'   => $disease->id,
                    'programmable_type' => PlanteMaladie::class,
                    'day_number'        => $i,
                    'date'              => $startDate->copy()->addDays($i - 1),
                    'recommendations'   => [
                        'title' => "Day {$i} - Treatment",
                        'tasks' => ['Apply recommended treatment', 'Monitor plant condition', 'Water appropriately'],
                    ],
                    'status' => 'pending',
                ]);
            }
        }
    }
}

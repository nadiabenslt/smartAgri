<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Plant\StepLocationRequest;
use App\Http\Requests\Plant\StepSoilRequest;
use App\Http\Requests\Plant\StepSizeRequest;
use App\Http\Requests\Plant\StepPlantRequest;
use App\Models\Planting;
use App\Models\WateringProgram;
use App\Services\GroqService;
use Illuminate\Support\Facades\Log;

class PlantController extends Controller
{
    protected GroqService $groq;

    public function __construct(GroqService $groq)
    {
        $this->groq = $groq;
    }

    // Step 1: Ask for location
    public function stepLocation(StepLocationRequest $request)
    {
        return response()->json([
            'step'    => 1,
            'message' => 'Location received. Now provide soil type.',
            'data'    => ['location' => $request->location],
            'next'    => [
                'step'   => 2,
                'url'    => '/api/plants/step/soil',
                'fields' => ['soil_type' => 'sandy | clay | loamy | silty | peaty | chalky'],
            ],
        ]);
    }

    // Step 2: Ask for soil type
    public function stepSoil(StepSoilRequest $request)
    {
        return response()->json([
            'step'    => 2,
            'message' => 'Soil type received. Now provide plant size.',
            'data'    => [
                'location'  => $request->location,
                'soil_type' => $request->soil_type,
            ],
            'next'    => [
                'step'   => 3,
                'url'    => '/api/plants/step/size',
                'fields' => ['size' => 'small | medium | large'],
            ],
        ]);
    }

    // Step 3: Ask for size
    public function stepSize(StepSizeRequest $request)
    {
        return response()->json([
            'step'    => 3,
            'message' => 'Size received. Now provide the plant name.',
            'data'    => [
                'location'  => $request->location,
                'soil_type' => $request->soil_type,
                'size'      => $request->size,
            ],
            'next'    => [
                'step'   => 4,
                'url'    => '/api/plants/step/plant',
                'fields' => ['plant_name' => 'string'],
            ],
        ]);
    }

    // Step 4: Final step — save plant + generate program
    public function stepPlant(StepPlantRequest $request)
    {
        // Save plant
        $plant = Planting::create([
            'user_id'    => $request->user()->id,
            'location'   => $request->location,
            'soil_type'  => $request->soil_type,
            'size'       => $request->size,
            'plant_name' => $request->plant_name,
        ]);

        // Get plant info + care tips
        $plantInfo = null;
        try {
            $plantInfo = $this->groq->getPlantInfo(
                plantName: $request->plant_name,
                soilType:  $request->soil_type,
                size:      $request->size,
                location:  $request->location,
            );
        } catch (\Exception $e) {
            Log::error('Groq plant info failed: ' . $e->getMessage());
        }

        // Generate 7-day watering & fertilizing program
        $weeklyProgram = [];
        try {
            $raw = $this->groq->ask(
                prompt: "Create a 7-day watering and fertilizing program for a {$request->plant_name} plant.
                         Size: {$request->size}, Soil: {$request->soil_type}, Location: {$request->location}.
                         Respond ONLY with a valid JSON array of 7 objects. No extra text. Format:
                         [
                           {
                             \"day\": \"Monday\",
                             \"watering\": {
                               \"required\": true,
                               \"amount\": \"200ml\",
                               \"time\": \"morning\"
                             },
                             \"fertilizing\": {
                               \"required\": false,
                               \"type\": null,
                               \"note\": null
                             }
                           }
                         ]",
                systemPrompt: "You are a plant care expert. Respond ONLY with raw JSON, no markdown, no explanation."
            );

            $clean   = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', trim($raw));
            $decoded = json_decode($clean, true);

            if (is_array($decoded)) {
                foreach ($decoded as $day) {
                    $record = WateringProgram::create([
                        'planting_id'          => $plant->id,
                        'day'                  => $day['day'],
                        'watering_required'    => $day['watering']['required'] ?? false,
                        'watering_amount'      => $day['watering']['amount'] ?? null,
                        'watering_time'        => $day['watering']['time'] ?? null,
                        'fertilizing_required' => $day['fertilizing']['required'] ?? false,
                        'fertilizing_type'     => $day['fertilizing']['type'] ?? null,
                        'fertilizing_note'     => $day['fertilizing']['note'] ?? null,
                    ]);
                    $weeklyProgram[] = $record;
                }
            }
        } catch (\Exception $e) {
            Log::error('Groq weekly program failed: ' . $e->getMessage());
        }

        return response()->json([
            'message'        => 'Plant added successfully!',
            'plant'          => $plant,
            'plant_info'     => $plantInfo,
            'weekly_program' => $weeklyProgram,
        ], 201);
    }

    // Get all plants with their programs
    public function index()
    {
        $plants = Planting::where('user_id', auth()->id())
                          ->with('wateringPrograms')
                          ->get();

        return response()->json([
            'plants' => $plants,
        ]);
    }

    // Get single plant with program
    public function show($id)
    {
        $plant = Planting::where('user_id', auth()->id())
                         ->with('wateringPrograms')
                         ->findOrFail($id);

        return response()->json([
            'plant' => $plant,
        ]);
    }
}
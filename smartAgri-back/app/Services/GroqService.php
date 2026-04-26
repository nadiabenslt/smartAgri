<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GroqService
{
    protected ?string $apiKey;
    protected ?string $model;
    protected ?string $url;

    public function __construct()
    {
        $this->apiKey = config('services.groq.key');
        $this->model  = config('services.groq.model');
        $this->url    = config('services.groq.url');
    }

    public function ask(string $prompt, string $systemPrompt = '', ?string $imageBase64 = null): string
    {
        $messages = [];

        if ($systemPrompt) {
            $messages[] = [
                'role'    => 'system',
                'content' => $systemPrompt,
            ];
        }

        if ($imageBase64) {
            $messages[] = [
                'role'    => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => $prompt
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => [
                            'url' => 'data:image/jpeg;base64,' . $imageBase64
                        ]
                    ]
                ]
            ];
        } else {
            $messages[] = [
                'role'    => 'user',
                'content' => $prompt,
            ];
        }

        // If an image is provided, we MUST use a vision model
        $modelToUse = $imageBase64 ? 'llama-3.2-11b-vision-instruct' : $this->model;

        $response = Http::withoutVerifying()   // fix: cURL SSL cert issue on Windows localhost
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type'  => 'application/json',
            ])->post($this->url, [
                'model'       => $modelToUse,
                'messages'    => $messages,
                'temperature' => 0.7,
                'max_tokens'  => 1024,
            ]);

        if ($response->failed()) {
            throw new \Exception('Groq API error: ' . $response->body());
        }

        return $response->json('choices.0.message.content') ?? '';
    }
}

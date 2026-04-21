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

    public function ask(string $prompt, string $systemPrompt = ''): string
    {
        $messages = [];

        if ($systemPrompt) {
            $messages[] = [
                'role'    => 'system',
                'content' => $systemPrompt,
            ];
        }

        $messages[] = [
            'role'    => 'user',
            'content' => $prompt,
        ];

        $response = Http::withoutVerifying()   // fix: cURL SSL cert issue on Windows localhost
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type'  => 'application/json',
            ])->post($this->url, [
                'model'       => $this->model,
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

<?php

namespace App\Services;

use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Kreait\Firebase\Messaging\AndroidConfig;
use Illuminate\Support\Facades\Log;

class FCMService
{
    protected $messaging;

    public function __construct(Messaging $messaging)
    {
        $this->messaging = $messaging;
    }

    public function sendPushNotification($fcmToken, $title, $body, $data = [])
    {
        if (!$fcmToken) {
            return false;
        }

        // Only the notification title should be visible initially.
        // The content (body) should be hidden until the user opens the notification.
        // We set the Notification body to 'Tap to view message' and pass the real body in data.
        $notification = Notification::create($title, 'Appuyez pour voir le message');

        $androidConfig = AndroidConfig::fromArray([
            'notification' => [
                'icon' => 'notification_icon',
                'color' => '#48BB78',
            ],
        ]);

        $message = CloudMessage::withTarget('token', $fcmToken)
            ->withNotification($notification)
            ->withAndroidConfig($androidConfig)
            ->withData(array_merge($data, [
                'real_body' => $body,
                'screen' => 'notifications'
            ]));

        try {
            $this->messaging->send($message);
            return true;
        } catch (\Exception $e) {
            Log::error('FCM Send Error: ' . $e->getMessage());
            return false;
        }
    }
}

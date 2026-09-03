<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class PesananBaruNotification extends Notification
{
    use Queueable;

    public $orderData;

    public function __construct($orderData)
    {
        $this->orderData = $orderData;
    }

    public function via($notifiable)
    {
        return [WebPushChannel::class];
    }

    public function toWebPush($notifiable, $notification)
    {
        $nominal = number_format($this->orderData['total_harga'], 0, ',', '.');
        $nama = $this->orderData['nama_anggota'] ?? 'Anggota';

        return (new WebPushMessage)
            ->title('Pesanan Baru Masuk!')
            ->icon('/favicon.svg')
            ->body("{$nama} memesan dengan total Rp {$nominal}.")
            ->action('Lihat Pesanan', '/kasir/pesanan')
            ->data(['url' => '/kasir/pesanan'])
            ->options(['TTL' => 1000]);
    }
}

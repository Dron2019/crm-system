<?php

namespace App\Notifications;

use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TeamInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Invitation $invitation,
        private readonly Team $team,
        private readonly User $inviter,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $invitationUrl = $frontendUrl . '/invitation/' . $this->invitation->token;

        return (new MailMessage)
            ->subject('You are invited to join a team in ' . config('app.name'))
            ->greeting('Hello!')
            ->line($this->inviter->name . ' invited you to join team "' . $this->team->name . '" as ' . $this->invitation->role . '.')
            ->action('Accept Invitation', $invitationUrl)
            ->line('This invitation expires on ' . $this->invitation->expires_at->format('Y-m-d H:i') . '.')
            ->line('If you were not expecting this invitation, you can safely ignore this email.');
    }
}

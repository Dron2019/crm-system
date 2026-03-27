<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class MfaController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'enabled' => (bool) $user->mfa_enabled,
            ],
        ]);
    }

    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        $user->update([
            'mfa_secret' => $secret,
            'mfa_enabled' => false,
        ]);

        $qrCodeUrl = $google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret,
        );

        // Generate SVG QR code
        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd(),
        );
        $writer = new Writer($renderer);
        $qrSvg = $writer->writeString($qrCodeUrl);

        return response()->json([
            'data' => [
                'enabled' => false,
                'secret' => $secret,
                'qr_svg' => $qrSvg,
            ],
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        $google2fa = new Google2FA();

        $valid = $google2fa->verifyKey($user->mfa_secret, $request->input('code'));

        if (!$valid) {
            throw ValidationException::withMessages([
                'code' => ['The verification code is invalid.'],
            ]);
        }

        // Generate recovery codes
        $recoveryCodes = collect(range(1, 8))
            ->map(fn () => Str::random(10))
            ->toArray();

        $user->update([
            'mfa_enabled' => true,
            'mfa_confirmed_at' => now(),
            'mfa_recovery_codes' => $recoveryCodes,
        ]);

        return response()->json([
            'data' => [
                'enabled' => true,
                'recovery_codes' => $recoveryCodes,
            ],
        ]);
    }

    public function disable(Request $request): JsonResponse
    {
        $request->user()->update([
            'mfa_secret' => null,
            'mfa_enabled' => false,
            'mfa_recovery_codes' => null,
            'mfa_confirmed_at' => null,
        ]);

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();
        $code = $request->input('code');
        $google2fa = new Google2FA();

        // Try TOTP first
        if ($google2fa->verifyKey($user->mfa_secret, $code)) {
            return response()->json(['message' => 'Verified.']);
        }

        // Try recovery code
        $recoveryCodes = $user->mfa_recovery_codes ?? [];
        if (in_array($code, $recoveryCodes, true)) {
            $user->update([
                'mfa_recovery_codes' => array_values(array_diff($recoveryCodes, [$code])),
            ]);
            return response()->json(['message' => 'Verified with recovery code.']);
        }

        throw ValidationException::withMessages([
            'code' => ['The code is invalid.'],
        ]);
    }
}

<?php

namespace App\Http\Middleware;

use App\Domain\Integration\Models\ApiKey;
use App\Domain\Shared\TeamContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiKey
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $rawKey = $this->getApiKey($request);

        if (! $rawKey) {
            return response()->json([
                'message' => 'Unauthenticated: API Key is missing.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (! str_starts_with($rawKey, 'cdk_')) {
            return response()->json([
                'message' => 'Unauthenticated: Invalid API Key format.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $prefix = substr($rawKey, 0, 8);

        $apiKey = ApiKey::where('key_prefix', $prefix)->first();

        if (! $apiKey || ! Hash::check($rawKey, $apiKey->key_hash)) {
            return response()->json([
                'message' => 'Unauthenticated: Invalid API Key.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if ($apiKey->isExpired()) {
            return response()->json([
                'message' => 'Unauthenticated: API Key has expired.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Verify permissions if specified
        if (! empty($permissions)) {
            foreach ($permissions as $permission) {
                if (! ($apiKey->permissions[$permission] ?? false)) {
                    return response()->json([
                        'message' => "Unauthorized: Missing required permission [{$permission}].",
                    ], Response::HTTP_FORBIDDEN);
                }
            }
        }

        // Set multi-tenancy context
        app(TeamContext::class)->set($apiKey->team);

        // Update last used at timestamp
        $apiKey->timestamps = false;
        $apiKey->update(['last_used_at' => now()]);

        // Attach key to request for reference in controllers
        $request->attributes->set('api_key', $apiKey);

        return $next($request);
    }

    /**
     * Extract the API key from Bearer token or query parameter.
     */
    protected function getApiKey(Request $request): ?string
    {
        $header = $request->header('Authorization');

        if ($header && str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }

        return $request->query('api_key');
    }
}

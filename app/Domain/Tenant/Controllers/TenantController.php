<?php

namespace App\Domain\Tenant\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Tenant\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class TenantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $tenants = Tenant::with(['company', 'groups'])
            ->orderBy('name')
            ->paginate(50);

        return response()->json($tenants);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $team = app(TeamContext::class)->get();

        $validated = $request->validate([
            'company_id' => [
                'nullable',
                Rule::exists('companies', 'id')->where('team_id', $team->id),
            ],
            'external_id' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                'max:255',
                // Unique email per team
                Rule::unique('tenants')->where('team_id', $team->id),
            ],
            'phone' => 'nullable|string|max:50',
            'timezone' => 'nullable|string|max:100',
            'locale' => 'nullable|string|max:10',
            'metadata' => 'nullable|array',
        ]);

        $tenant = Tenant::create(array_merge($validated, [
            'team_id' => $team->id,
        ]));

        return response()->json($tenant, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Tenant $tenant): JsonResponse
    {
        return response()->json($tenant->load(['company', 'groups', 'threads']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $team = app(TeamContext::class)->get();

        $validated = $request->validate([
            'company_id' => [
                'nullable',
                Rule::exists('companies', 'id')->where('team_id', $team->id),
            ],
            'external_id' => 'nullable|string|max:255',
            'name' => 'nullable|string|max:255',
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('tenants')->where('team_id', $team->id)->ignore($tenant->id),
            ],
            'phone' => 'nullable|string|max:50',
            'timezone' => 'nullable|string|max:100',
            'locale' => 'nullable|string|max:10',
            'metadata' => 'nullable|array',
        ]);

        $tenant->update($validated);

        return response()->json($tenant);
    }
}

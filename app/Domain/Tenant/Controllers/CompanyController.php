<?php

namespace App\Domain\Tenant\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Tenant\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $companies = Company::orderBy('name')->paginate(50);

        return response()->json($companies);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $team = app(TeamContext::class)->get();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'domain' => 'nullable|string|max:255',
            'logo_url' => 'nullable|url|max:2048',
            'metadata' => 'nullable|array',
        ]);

        $slug = Str::slug($validated['name']);

        // Ensure unique slug per team
        $count = Company::where('slug', $slug)->count();
        if ($count > 0) {
            $slug .= '-'.Str::random(5);
        }

        $company = Company::create(array_merge($validated, [
            'team_id' => $team->id,
            'slug' => $slug,
        ]));

        return response()->json($company, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Company $company): JsonResponse
    {
        return response()->json($company->load('tenants'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Company $company): JsonResponse
    {
        $team = app(TeamContext::class)->get();

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'domain' => 'nullable|string|max:255',
            'logo_url' => 'nullable|url|max:2048',
            'metadata' => 'nullable|array',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $company->name) {
            $slug = Str::slug($validated['name']);
            $count = Company::where('slug', $slug)->where('id', '!=', $company->id)->count();
            if ($count > 0) {
                $slug .= '-'.Str::random(5);
            }
            $validated['slug'] = $slug;
        }

        $company->update($validated);

        return response()->json($company);
    }
}

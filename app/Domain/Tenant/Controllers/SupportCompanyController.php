<?php

namespace App\Domain\Tenant\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\Task;
use App\Domain\Tenant\Models\Company;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupportCompanyController extends Controller
{
    /**
     * Display a listing of customer companies.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $companies = Company::with(['tier', 'owner'])
            ->withCount('tenants')
            ->orderBy('name')
            ->get();

        // Fetch dynamic tiers list to use in filters row
        $tiers = Tier::orderBy('position')->get();

        return Inertia::render('support/companies', [
            'companies' => $companies,
            'tiers' => $tiers,
        ]);
    }

    /**
     * Display the specified company workspace.
     */
    public function show(Request $request, string $id): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        // Find company by ID or Slug
        $company = Company::where('id', $id)
            ->orWhere('slug', $id)
            ->with(['tier', 'owner', 'tenants'])
            ->firstOrFail();

        // Fetch threads belonging to company's contacts
        $tenantIds = $company->tenants->pluck('id');
        $threads = Thread::whereIn('tenant_id', $tenantIds)
            ->with(['tenant', 'assignee', 'tier'])
            ->latest('updated_at')
            ->get();

        // Fetch tasks linked directly to this company
        $tasks = Task::where('company_id', $company->id)
            ->with(['assignee', 'tenant'])
            ->latest()
            ->get();

        // Options for the detail side editor
        $teamMembers = $team->members()->select('users.id', 'users.name', 'users.email')->get();
        $tiers = Tier::orderBy('position')->get();

        return Inertia::render('support/company-details', [
            'company' => $company,
            'threads' => $threads,
            'tasks' => $tasks,
            'teamMembers' => $teamMembers,
            'tiers' => $tiers,
        ]);
    }

    /**
     * Store a newly created company.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'domain' => 'nullable|string|max:255',
        ]);

        $slug = Str::slug($validated['name']);
        $count = Company::where('slug', $slug)->count();
        if ($count > 0) {
            $slug .= '-'.Str::random(5);
        }

        Company::create(array_merge($validated, [
            'team_id' => $team->id,
            'slug' => $slug,
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Company created successfully.']);

        return redirect()->back();
    }

    /**
     * Update the specified company details.
     */
    public function update(Request $request, Company $company): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'domain' => 'nullable|string|max:255',
            'contract_value' => 'nullable|integer|min:0',
            'owner_id' => 'nullable|exists:users,id',
            'tier_id' => 'nullable|exists:tiers,id',
        ]);

        $company->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Company updated successfully.']);

        return redirect()->back();
    }

    /**
     * Remove the specified company.
     */
    public function destroy(Request $request, Company $company): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $company->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Company deleted successfully.']);

        return redirect()->route('companies.index');
    }
}

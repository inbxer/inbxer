<?php

namespace App\Domain\Tenant\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\Task;
use App\Domain\Tenant\Models\Company;
use App\Domain\Tenant\Models\CustomerGroup;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupportTenantController extends Controller
{
    /**
     * Display a listing of customer contacts (tenants).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $tenants = Tenant::with(['company', 'tier'])
            ->orderBy('name')
            ->get();

        $companies = Company::orderBy('name')->get();
        $tiers = Tier::orderBy('position')->get();

        return Inertia::render('support/tenants', [
            'tenants' => $tenants,
            'companies' => $companies,
            'tiers' => $tiers,
        ]);
    }

    /**
     * Display the specified tenant profile details workspace.
     */
    public function show(Request $request, string $id): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $tenant = Tenant::where('id', $id)
            ->with(['company', 'tier', 'customers', 'groups'])
            ->firstOrFail();

        // Fetch threads belonging to this tenant
        $threads = Thread::where('tenant_id', $tenant->id)
            ->with(['tenant', 'assignee', 'tier'])
            ->latest('updated_at')
            ->get();

        // Fetch tasks belonging to this tenant
        $tasks = Task::where('tenant_id', $tenant->id)
            ->with(['assignee', 'tenant', 'company'])
            ->latest()
            ->get();

        $tiers = Tier::orderBy('position')->get();
        $groups = CustomerGroup::where('team_id', $team->id)->orderBy('name')->get();

        return Inertia::render('support/tenant-details', [
            'tenant' => $tenant,
            'threads' => $threads,
            'tasks' => $tasks,
            'tiers' => $tiers,
            'customers' => $tenant->customers,
            'groups' => $groups,
        ]);
    }

    /**
     * Store a newly created tenant.
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
            'external_id' => 'nullable|string|max:255',
            'company_id' => [
                'nullable',
                Rule::exists('companies', 'id')->where('team_id', $team->id),
            ],
            'parent_tenant_id' => [
                'nullable',
                Rule::exists('tenants', 'id')->where('team_id', $team->id),
            ],
        ]);

        $companyId = $validated['company_id'] ?? null;

        if (! $companyId && ! empty($validated['parent_tenant_id'])) {
            $parentTenant = Tenant::where('team_id', $team->id)->find($validated['parent_tenant_id']);
            if ($parentTenant) {
                if ($parentTenant->company_id) {
                    $companyId = $parentTenant->company_id;
                } else {
                    $company = Company::create([
                        'team_id' => $team->id,
                        'name' => $parentTenant->name,
                        'slug' => Str::slug($parentTenant->name).'-'.strtolower(Str::random(5)),
                    ]);
                    $parentTenant->update(['company_id' => $company->id]);
                    $companyId = $company->id;
                }
            }
        }

        unset($validated['parent_tenant_id']);
        if ($companyId) {
            $validated['company_id'] = $companyId;
        }

        $randomString = strtolower(Str::random(12));
        $email = 'tenant-'.$randomString.'@inbxer.local';

        Tenant::create(array_merge($validated, [
            'team_id' => $team->id,
            'email' => $email,
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tenant contact created successfully.']);

        return redirect()->back();
    }

    /**
     * Update the specified tenant details.
     */
    public function update(Request $request, Tenant $tenant): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => [
                'nullable',
                'email',
                Rule::unique('tenants')->where('team_id', $team->id)->ignore($tenant->id),
            ],
            'external_id' => 'nullable|string|max:255',
            'company_id' => [
                'nullable',
                Rule::exists('companies', 'id')->where('team_id', $team->id),
            ],
            'phone' => 'nullable|string|max:50',
            'tier_id' => 'nullable|exists:tiers,id',
        ]);

        $tenant->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tenant details updated successfully.']);

        return redirect()->back();
    }

    /**
     * Remove the specified tenant.
     */
    public function destroy(Request $request, Tenant $tenant): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $tenant->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tenant contact deleted successfully.']);

        return redirect()->route('tenants.index');
    }

    /**
     * Sync groups for the specified tenant.
     */
    public function syncGroups(Request $request, Tenant $tenant): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'group_ids' => 'array',
            'group_ids.*' => 'exists:customer_groups,id',
        ]);

        $tenant->groups()->sync($validated['group_ids'] ?? []);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer groups updated successfully.']);

        return redirect()->back();
    }
}

<?php

namespace App\Domain\Tenant\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Tenant\Models\Company;
use App\Domain\Tenant\Models\Customer;
use App\Domain\Tenant\Models\CustomerGroup;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupportCustomerController extends Controller
{
    /**
     * Store a newly created customer for a tenant.
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
            'tenant_id' => [
                'required',
                Rule::exists('tenants', 'id')->where('team_id', $team->id),
            ],
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'external_id' => 'nullable|string|max:255',
        ]);

        Customer::create(array_merge($validated, [
            'team_id' => $team->id,
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer created successfully.']);

        return redirect()->back();
    }

    /**
     * Display the specified customer profile details workspace.
     */
    public function show(Request $request, string $id): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $customer = Customer::where('id', $id)
            ->with(['tenant.company', 'company', 'group'])
            ->firstOrFail();

        $threads = Thread::where('tenant_id', $customer->tenant_id)
            ->with(['tenant', 'assignee', 'tier', 'labels'])
            ->latest('updated_at')
            ->get();

        $tenants = Tenant::orderBy('name')->get();
        $companies = Company::orderBy('name')->get();
        $groups = CustomerGroup::orderBy('name')->get();

        return Inertia::render('support/customer-details', [
            'customer' => $customer,
            'threads' => $threads,
            'tenants' => $tenants,
            'companies' => $companies,
            'groups' => $groups,
        ]);
    }

    /**
     * Update the specified customer attributes.
     */
    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'external_id' => 'nullable|string|max:255',
            'tenant_id' => [
                'nullable',
                Rule::exists('tenants', 'id')->where('team_id', $team->id),
            ],
            'company_id' => [
                'nullable',
                Rule::exists('companies', 'id')->where('team_id', $team->id),
            ],
            'customer_group_id' => [
                'nullable',
                Rule::exists('customer_groups', 'id')->where('team_id', $team->id),
            ],
        ]);

        $customer->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer details updated successfully.']);

        return redirect()->back();
    }

    /**
     * Remove the specified customer.
     */
    public function destroy(Request $request, Customer $customer): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $customer->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer deleted successfully.']);

        return redirect()->route('tenants.index');
    }
}

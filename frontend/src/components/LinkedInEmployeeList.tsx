import { useState } from 'react';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserPlusIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { companiesApi } from '../services/api';

interface Employee {
  linkedinUrl: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  location?: string;
  profilePicture?: string;
}

interface LinkedInEmployeeListProps {
  companyId: string;
  companyName: string;
  linkedinUrl?: string;
}

export function LinkedInEmployeeList({
  companyId,
  companyName,
  linkedinUrl,
}: LinkedInEmployeeListProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchEmployees = async () => {
    if (!linkedinUrl) {
      setError('No LinkedIn URL set for this company');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await companiesApi.getCompanyEmployees(companyId, {
        limit: 20,
        enrich: false,
      });

      setEmployees(response.employees || []);
      setHasLoaded(true);

      if (response.employees.length === 0) {
        setError('No employees found. The company may not be accessible or may not have public employee listings.');
      } else {
        setSuccess(`Found ${response.employees.length} employees`);
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployeeSelection = (linkedinUrl: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(linkedinUrl)) {
      newSelected.delete(linkedinUrl);
    } else {
      newSelected.add(linkedinUrl);
    }
    setSelectedEmployees(newSelected);
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(emp => emp.linkedinUrl)));
    }
  };

  const importSelectedEmployees = async () => {
    if (selectedEmployees.size === 0) {
      setError('Please select at least one employee to import');
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await companiesApi.importEmployeesAsContacts(
        companyId,
        Array.from(selectedEmployees)
      );

      setSuccess(
        `Successfully imported ${response.imported} employees as contacts${
          response.errors > 0 ? ` (${response.errors} errors)` : ''
        }`
      );

      // Clear selection after successful import
      setSelectedEmployees(new Set());
    } catch (err: any) {
      console.error('Error importing employees:', err);
      setError(err.response?.data?.message || err.message || 'Failed to import employees');
    } finally {
      setImporting(false);
    }
  };

  const handleFindLinkedInUrl = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await companiesApi.findLinkedInUrl(companyId);

      if (response.success && response.linkedinUrl) {
        setSuccess(`LinkedIn URL found and saved: ${response.linkedinUrl}`);
        // Reload the page to show the new URL
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err: any) {
      console.error('Error finding LinkedIn URL:', err);
      setError(
        err.response?.data?.message ||
        'Could not find LinkedIn URL automatically. Please add it manually.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!linkedinUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">LinkedIn Employees</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">Find Company Employees via RapidAPI</h4>
              <p className="text-sm text-gray-600 mb-4">
                Automatically discover employee profiles from LinkedIn using AI-powered search.
              </p>
              <button
                type="button"
                onClick={handleFindLinkedInUrl}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Finding Company...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    Find via RapidAPI
                  </>
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">LinkedIn Employees</h3>
          {hasLoaded && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {employees.length} found
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={fetchEmployees}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="w-4 h-4" />
              {hasLoaded ? 'Refresh via RapidAPI' : 'Fetch via RapidAPI'}
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Employee List */}
      {hasLoaded && employees.length > 0 && (
        <>
          {/* Bulk Actions */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedEmployees.size === employees.length}
                onChange={selectAllEmployees}
                aria-label="Select all employees"
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {selectedEmployees.size} of {employees.length} selected
              </span>
            </div>

            {selectedEmployees.size > 0 && (
              <button
                type="button"
                onClick={importSelectedEmployees}
                disabled={importing}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <UserPlusIcon className="w-4 h-4" />
                {importing ? 'Importing...' : `Import ${selectedEmployees.size} as Contacts`}
              </button>
            )}
          </div>

          {/* Employee Cards */}
          <div className="grid grid-cols-1 gap-3">
            {employees.map((employee) => (
              <div
                key={employee.linkedinUrl}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.has(employee.linkedinUrl)}
                  onChange={() => toggleEmployeeSelection(employee.linkedinUrl)}
                  aria-label={`Select ${employee.fullName || 'employee'}`}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />

                {employee.profilePicture ? (
                  <img
                    src={employee.profilePicture}
                    alt={employee.fullName || 'Employee'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserGroupIcon className="w-6 h-6 text-gray-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Name'}
                  </h4>
                  {employee.title && (
                    <p className="text-sm text-gray-600 truncate">{employee.title}</p>
                  )}
                  {employee.location && (
                    <p className="text-xs text-gray-500 truncate">{employee.location}</p>
                  )}
                </div>

                <a
                  href={employee.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex-shrink-0"
                >
                  View Profile →
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {hasLoaded && employees.length === 0 && !error && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-1">No Employees Found</h4>
          <p className="text-sm text-gray-600">
            Unable to find public employee listings for this company.
          </p>
        </div>
      )}
    </div>
  );
}

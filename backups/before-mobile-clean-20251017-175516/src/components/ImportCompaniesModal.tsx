import { useState, useRef } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import * as Papa from 'papaparse';

interface ImportCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface Company {
  name: string;
  domain?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
  website?: string;
  employeeCount?: string;
  headquarters?: string;
  enriched?: boolean;
  aiEnhanced?: string[];
}

type ProcessingStatus = 'pending' | 'processing' | 'done' | 'error';

export function ImportCompaniesModal({ isOpen, onClose, onImportComplete }: ImportCompaniesModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [processingStatus, setProcessingStatus] = useState<Record<number, ProcessingStatus>>({});
  const [enrichedCount, setEnrichedCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const isValidType = validTypes.includes(selectedFile.type) ||
                        selectedFile.name.endsWith('.csv') ||
                        selectedFile.name.endsWith('.xlsx');

    if (!isValidType) {
      alert('Please select a CSV or XLSX file');
      return;
    }

    setFile(selectedFile);

    // Parse CSV
    Papa.parse(selectedFile, {
      header: true,
      complete: (results) => {
        const parsedCompanies = results.data
          .filter((row: any) => row.name || row.Name || row['Company Name'])
          .map((row: any) => ({
            name: row.name || row.Name || row['Company Name'],
            domain: row.domain || row.Domain || row.Website?.replace(/https?:\/\//g, '').split('/')[0],
            industry: row.industry || row.Industry,
            location: row.location || row.Location || row.Headquarters,
            size: row.size || row.Size || row['Company Size'],
            description: row.description || row.Description,
            website: row.website || row.Website,
            employeeCount: row.employeeCount || row.Employees || row['Employee Count'],
          }));

        setCompanies(parsedCompanies);

        // Initialize processing status
        const initialStatus: Record<number, ProcessingStatus> = {};
        parsedCompanies.forEach((_, i) => {
          initialStatus[i] = 'pending';
        });
        setProcessingStatus(initialStatus);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file. Please check the file format.');
      },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] }
      } as any;
      handleFileUpload(fakeEvent);
    }
  };

  const handleAIEnrichment = async () => {
    setCurrentStep(2);

    try {
      const token = localStorage.getItem('crmToken');

      // Set all to processing
      const processingStatuses: Record<number, ProcessingStatus> = {};
      companies.forEach((_, i) => {
        processingStatuses[i] = 'processing';
      });
      setProcessingStatus(processingStatuses);

      // Call backend AI enrichment endpoint
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/companies/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ companies }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Enrichment failed');
      }

      // Update companies with enriched data
      setCompanies(result.companies);

      // Count enriched fields
      let enrichCount = 0;
      result.companies.forEach((company: Company, i: number) => {
        if (company.aiEnhanced && company.aiEnhanced.length > 0) {
          enrichCount += company.aiEnhanced.length;
          setProcessingStatus(prev => ({ ...prev, [i]: 'done' }));
        } else {
          setProcessingStatus(prev => ({ ...prev, [i]: company.enrichmentFailed ? 'error' : 'done' }));
        }
      });

      setEnrichedCount(enrichCount);

      // Move to review step after 1 second
      setTimeout(() => {
        setCurrentStep(3);
      }, 1000);

    } catch (error: any) {
      console.error('AI enrichment error:', error);
      alert('Failed to enrich company data. Please try again.');

      // Mark all as error
      const errorStatuses: Record<number, ProcessingStatus> = {};
      companies.forEach((_, i) => {
        errorStatuses[i] = 'error';
      });
      setProcessingStatus(errorStatuses);
    }
  };

  const handleImport = async () => {
    setImporting(true);

    try {
      const token = localStorage.getItem('crmToken');

      // Create CSV content from enriched companies
      const csvHeaders = 'name,domain,industry,location,size,description,website,employeeCount\n';
      const csvRows = companies.map(c =>
        `"${c.name}","${c.domain || ''}","${c.industry || ''}","${c.location || ''}","${c.size || ''}","${c.description || ''}","${c.website || ''}","${c.employeeCount || ''}"`
      ).join('\n');
      const csvContent = csvHeaders + csvRows;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, 'enriched_companies.csv');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/companies/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }

      // Show success and close
      setTimeout(() => {
        onImportComplete();
        handleClose();
      }, 1500);

    } catch (error: any) {
      console.error('Import error:', error);
      alert(error.message || 'Failed to import companies');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFile(null);
    setCompanies([]);
    setProcessingStatus({});
    setEnrichedCount(0);
    setImporting(false);
    onClose();
  };

  const Step = ({ number, label, active }: { number: number; label: string; active: boolean }) => (
    <div className="flex items-center">
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${active ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'} font-semibold`}>
        {number}
      </div>
      <span className={`ml-3 text-sm font-medium ${active ? 'text-purple-600' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border-4 border-purple-300 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6 border-b-4 border-purple-700">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white">Import Companies with AI Enhancement</h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Step indicators - on colored background for visibility */}
        <div className="bg-purple-50 px-8 py-4 border-b-2 border-purple-200">
          <div className="flex items-center justify-between">
          <Step number={1} label="Upload CSV" active={currentStep === 1} />
          <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
          <Step number={2} label="AI Processing" active={currentStep === 2} />
          <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
          <Step number={3} label="Review & Import" active={currentStep === 3} />
          </div>
        </div>

        {/* Content area - clear white background */}
        <div className="flex-1 overflow-y-auto bg-white p-8">

        {/* STEP 1: Upload CSV */}
        {currentStep === 1 && (
          <div>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTrayIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your company CSV file here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse (CSV, XLSX accepted)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {file && companies.length > 0 && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  ✓ Found {companies.length} companies in {file.name}
                </p>
              </div>
            )}

            {/* CSV Requirements */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Required Columns:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Company Name (or name/Name)</li>
                <li>• Domain or Website URL (optional but recommended for AI enrichment)</li>
              </ul>
              <h4 className="font-semibold text-blue-900 mt-4 mb-2">Optional (AI will try to find):</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Industry, Headquarters, Employee Count, Description</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: AI Processing */}
        {currentStep === 2 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 mx-auto mb-6 flex items-center justify-center">
              <SparklesIcon className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              AI is Enriching Your Data
            </h3>
            <p className="text-gray-600 mb-6">
              Analyzing {companies.length} companies and gathering information...
            </p>

            {/* Progress for each company */}
            <div className="max-w-2xl mx-auto space-y-2 max-h-96 overflow-y-auto">
              {companies.map((company, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {processingStatus[i] === 'done' ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  ) : processingStatus[i] === 'processing' ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ClockIcon className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700">{company.name}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {processingStatus[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Review Enhanced Data */}
        {currentStep === 3 && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-800">
                <SparklesIcon className="w-5 h-5" />
                <span className="font-medium">
                  AI found {enrichedCount} additional data points across {companies.length} companies!
                </span>
              </div>
            </div>

            {/* Company cards with before/after */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {companies.map((company, i) => (
                <div key={i} className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{company.name}</h4>
                      <p className="text-sm text-gray-500">{company.domain || 'No domain'}</p>
                    </div>
                  </div>

                  {/* What AI found */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {company.industry && (
                      <div className={`${company.aiEnhanced?.includes('industry') ? 'bg-purple-50' : 'bg-gray-50'} rounded p-2`}>
                        <span className={`${company.aiEnhanced?.includes('industry') ? 'text-purple-600' : 'text-gray-600'} font-medium`}>Industry: </span>
                        <span className="text-gray-700">{company.industry}</span>
                        {company.aiEnhanced?.includes('industry') && (
                          <span className="ml-1 text-xs text-purple-600">✨ AI Found</span>
                        )}
                      </div>
                    )}
                    {(company.headquarters || company.location) && (
                      <div className={`${company.aiEnhanced?.includes('headquarters') ? 'bg-blue-50' : 'bg-gray-50'} rounded p-2`}>
                        <span className={`${company.aiEnhanced?.includes('headquarters') ? 'text-blue-600' : 'text-gray-600'} font-medium`}>HQ: </span>
                        <span className="text-gray-700">{company.headquarters || company.location}</span>
                        {company.aiEnhanced?.includes('headquarters') && (
                          <span className="ml-1 text-xs text-blue-600">✨ AI Found</span>
                        )}
                      </div>
                    )}
                    {(company.employeeCount || company.size) && (
                      <div className={`${company.aiEnhanced?.includes('size') ? 'bg-green-50' : 'bg-gray-50'} rounded p-2`}>
                        <span className={`${company.aiEnhanced?.includes('size') ? 'text-green-600' : 'text-gray-600'} font-medium`}>Size: </span>
                        <span className="text-gray-700">{company.employeeCount || company.size}</span>
                        {company.aiEnhanced?.includes('size') && (
                          <span className="ml-1 text-xs text-green-600">✨ AI Found</span>
                        )}
                      </div>
                    )}
                  </div>

                  {company.description && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      "{company.description.substring(0, 150)}..."
                      {company.aiEnhanced?.includes('description') && (
                        <span className="ml-1 text-xs text-purple-600">✨ AI Found</span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        </div>

        {/* Footer with actions - separated with border */}
        <div className="bg-gray-50 px-8 py-6 border-t-4 border-gray-200 flex justify-between items-center">
          <button
            onClick={handleClose}
            className="px-6 py-3 border-2 border-gray-400 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            disabled={importing}
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {currentStep > 1 && currentStep < 3 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-3 border-2 border-gray-400 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
            )}
            {currentStep === 1 && companies.length > 0 && (
              <>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-6 py-3 bg-white text-purple-700 border-2 border-purple-500 rounded-lg font-semibold hover:bg-purple-50 transition-all shadow-md disabled:opacity-50"
                >
                  Import Without Enrichment
                </button>
                <button
                  onClick={handleAIEnrichment}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Enhance with AI
                </button>
              </>
            )}
            {currentStep === 3 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-5 h-5" />
                    Import {companies.length} Companies
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

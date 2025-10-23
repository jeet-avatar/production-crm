import { useState, useEffect } from 'react';
import { XMarkIcon, UserCircleIcon, BuildingOfficeIcon, TagIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { contactsApi, tagsApi } from '../../services/api';
import { validatePhoneNumber, validateEmail } from '../../utils/validation';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: {
    id: string;
    name: string;
  };
  status: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST';
  tags: { id: string; name: string; color: string }[];
}

interface Company {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContactFormProps {
  contact?: Contact | null;
  companies: Company[];
  onClose: () => void;
}

export function ContactForm({ contact, companies, onClose }: ContactFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    companyId: '',
    companyName: '', // NEW: Allow typing company name to create new company
    status: 'LEAD' as 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST',
    tagIds: [] as string[],
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load form data when contact changes
  useEffect(() => {
    if (contact && contact.id !== 'new') {
      setFormData({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone || '',
        role: (contact as any).role || '',
        companyId: contact.company?.id || '',
        status: contact.status,
        tagIds: contact.tags.map(tag => tag.id),
      });
    } else if (contact && contact.id === 'new') {
      // New contact with pre-selected company
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        companyId: contact.company?.id || '',
        status: 'LEAD',
        tagIds: [],
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        companyId: '',
        status: 'LEAD',
        tagIds: [],
      });
    }
  }, [contact]);

  // Load available tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await tagsApi.getAll();
        setAvailableTags(response.tags || []);
      } catch (err) {
        console.error('Error loading tags:', err);
      }
    };
    loadTags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Frontend validation
    if (!formData.firstName.trim()) {
      setError('First name is required');
      setLoading(false);
      return;
    }

    if (!formData.lastName.trim()) {
      setError('Last name is required');
      setLoading(false);
      return;
    }

    // Validate email if provided
    if (formData.email && formData.email.trim()) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        setError(emailValidation.error || 'Invalid email address');
        setLoading(false);
        return;
      }
    }

    // Validate phone number if provided
    if (formData.phone && formData.phone.trim()) {
      const phoneValidation = validatePhoneNumber(formData.phone);
      if (!phoneValidation.isValid) {
        setError(phoneValidation.error || 'Invalid phone number');
        setLoading(false);
        return;
      }
    }

    try {
      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        role: formData.role.trim() || undefined,
        companyId: formData.companyId || undefined,
        companyName: formData.companyName.trim() || undefined, // NEW: Send company name for auto-creation
        status: formData.status,
        tagIds: formData.tagIds,
      };

      console.log('Submitting contact data:', submitData);
      console.log('Contact object:', contact);
      console.log('Contact ID check:', contact?.id, 'Is new?', contact?.id === 'new');

      // Check if this is an UPDATE (existing contact with valid ID that's not 'new')
      if (contact && contact.id && contact.id !== 'new') {
        console.log('Updating existing contact with ID:', contact.id);
        const result = await contactsApi.update(contact.id, submitData);
        console.log('Contact updated:', result);
      } else {
        // This is a CREATE (new contact or contact with id='new')
        console.log('Creating new contact');
        const result = await contactsApi.create(submitData);
        console.log('Contact created:', result);
      }

      // Show success message briefly before closing
      alert('Contact saved successfully!');
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save contact';

      // Provide user-friendly error message for duplicate email
      if (errorMessage.includes('Unique constraint') && errorMessage.includes('email')) {
        setError(`This email address is already in use. Please use a different email or leave it blank.`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  const statusOptions = [
    { value: 'LEAD', label: 'Lead', color: 'bg-orange-100 text-orange-700' },
    { value: 'PROSPECT', label: 'Prospect', color: 'bg-rose-100 text-rose-700' },
    { value: 'CUSTOMER', label: 'Customer', color: 'bg-green-100 text-green-700' },
    { value: 'COLD', label: 'Cold', color: 'bg-gray-100 text-gray-700' },
    { value: 'WARM', label: 'Warm', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'HOT', label: 'Hot', color: 'bg-red-100 text-red-700' },
    { value: 'CLOSED_WON', label: 'Closed Won', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'CLOSED_LOST', label: 'Closed Lost', color: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-[40px] shadow-2xl border-4 border-black max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 px-8 py-6 rounded-t-[40px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black">
                {contact ? 'Edit Contact' : 'Add New Contact'}
              </h2>
              <p className="text-black/90 text-sm mt-1">
                {contact ? 'Update contact information' : 'Create a new contact in your CRM'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-black/80 hover:text-black hover:bg-white/20 rounded-lg transition-all duration-200"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            {/* Personal Information Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <UserCircleIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-gray-400 text-xs">(optional, must be unique)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    placeholder="john.doe@example.com (leave blank if unknown)"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    placeholder="(555) 123-4567 or +1-555-123-4567"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Formats: (555) 123-4567, 555-123-4567, +1-555-123-4567, +44 20 1234 5678
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Details Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Professional Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select Role</option>
                    <option value="CEO">CEO</option>
                    <option value="CFO">CFO</option>
                    <option value="CTO">CTO</option>
                    <option value="COO">COO</option>
                    <option value="CMO">CMO</option>
                    <option value="CIO">CIO</option>
                    <option value="VP Sales">VP Sales</option>
                    <option value="VP Marketing">VP Marketing</option>
                    <option value="VP Product">VP Product</option>
                    <option value="VP Engineering">VP Engineering</option>
                    <option value="Director">Director</option>
                    <option value="Manager">Manager</option>
                    <option value="Controller">Controller</option>
                    <option value="IT Director">IT Director</option>
                    <option value="Sales Rep">Sales Rep</option>
                    <option value="Account Manager">Account Manager</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <select
                    id="companyId"
                    value={formData.companyId}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value, companyName: '' }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 mb-2"
                  >
                    <option value="">Select existing company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-center text-sm text-gray-500 mb-2">or</div>
                  <input
                    type="text"
                    placeholder="Type new company name to create"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value, companyId: '' }))}
                    disabled={!!formData.companyId}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {formData.companyName && !formData.companyId && (
                    <p className="mt-2 text-xs text-green-600">
                      ✨ A new company "{formData.companyName}" will be created
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FunnelIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Status</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: option.value as any }))}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                      formData.status === option.value
                        ? `${option.color} border-current shadow-md scale-105`
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Section */}
            {availableTags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TagIcon className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Tags</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all duration-200 ${
                        formData.tagIds.includes(tag.id)
                          ? 'bg-orange-100 border-orange-500 text-orange-700 shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 px-8 py-6 bg-gray-50">
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-8 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-black font-bold rounded-lg border-2 border-black hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  (contact && contact.id !== 'new') ? 'Update Contact' : 'Create Contact'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

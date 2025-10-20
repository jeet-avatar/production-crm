import { useState, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    variables: string[];
  };
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  position?: string;
  phone?: string;
}

export function SendEmailModal({ isOpen, onClose, template }: SendEmailModalProps) {
  const { gradients } = useTheme();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sendMode, setSendMode] = useState<'contacts' | 'test'>('contacts');

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      setSelectedContacts([]);
      setSearchQuery('');
      setTestEmail('');
      setError(null);
      setSuccess(null);
      setSendMode('contacts');
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.email &&
    (contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     contact.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const handleSendToContacts = async () => {
    if (selectedContacts.length === 0) {
      setError('Please select at least one contact');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('crmToken');
      const recipients = contacts
        .filter(c => selectedContacts.includes(c.id))
        .map(c => ({
          email: c.email || '',
          firstName: c.firstName || '',
          lastName: c.lastName || '',
          companyName: c.companyName || '',
          position: c.position || '',
          phone: c.phone || '',
        }));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates/${template.id}/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipients,
            variables: {}, // Variables will be filled from recipient data
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }

      setSuccess(data.message || `Successfully sent to ${selectedContacts.length} contacts`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error sending emails:', err);
      setError(err.message || 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates/${template.id}/test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            testEmail,
            variables: {
              firstName: 'Test',
              lastName: 'User',
              companyName: 'Test Company',
              position: 'Test Position',
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setSuccess(data.message || 'Test email sent successfully');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error sending test email:', err);
      setError(err.message || 'Failed to send test email');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} p-6 text-white rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Send Email</h2>
              <p className="text-white text-opacity-90 text-sm mt-1">
                Template: {template.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="mb-6">
            <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setSendMode('contacts')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-bold transition-all ${
                  sendMode === 'contacts'
                    ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-md`
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <UserGroupIcon className="h-5 w-5 inline mr-2" />
                Send to Contacts
              </button>
              <button
                type="button"
                onClick={() => setSendMode('test')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-bold transition-all ${
                  sendMode === 'test'
                    ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-md`
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <PaperAirplaneIcon className="h-5 w-5 inline mr-2" />
                Send Test Email
              </button>
            </div>
          </div>

          {sendMode === 'contacts' ? (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Select All */}
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <span className="text-sm font-bold text-gray-700">
                    Select All ({filteredContacts.length})
                  </span>
                </label>
                <span className="text-sm font-medium text-gray-600">
                  {selectedContacts.length} selected
                </span>
              </div>

              {/* Contacts List */}
              <div className="border border-gray-200 rounded-xl max-h-96 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No contacts found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredContacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => handleToggleContact(contact.id)}
                          className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="text-xs text-gray-600 truncate">{contact.email}</p>
                          {contact.companyName && (
                            <p className="text-xs text-gray-500">{contact.companyName}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Test Email */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Test Email Address
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Test emails will use sample data for template variables
                </p>
              </div>

              {/* Template Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-700 mb-2">Subject Preview:</p>
                <p className="text-sm text-gray-900 font-medium mb-3">{template.subject}</p>

                <p className="text-xs font-bold text-gray-700 mb-2">Variables in this template:</p>
                {template.variables && template.variables.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 rounded-lg text-xs font-bold text-orange-700 bg-orange-100"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No variables detected</p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="pt-6 flex justify-end gap-3 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-xl font-bold tracking-wide hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={sendMode === 'contacts' ? handleSendToContacts : handleSendTest}
              disabled={isSending || (sendMode === 'contacts' && selectedContacts.length === 0)}
              className={`inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              {isSending ? 'Sending...' : sendMode === 'contacts' ? `Send to ${selectedContacts.length} Contact${selectedContacts.length !== 1 ? 's' : ''}` : 'Send Test Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

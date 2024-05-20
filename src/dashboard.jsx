// ==============================================================================
// DASHBOARD COMPONENT - Business Owner Main Page
// ==============================================================================
// This is the main hub for business owners after they log in. It displays:
// - Payment link (URL) that customers use to pay them
// - QR code for mobile payments
// - Business profile information (bank account details)
// - Payment history showing received payments
// - Edit/update business profile functionality
//
// USER FLOW:
// 1. Business owner logs in
// 2. Dashboard checks if they have business profile set up
// 3. If no profile: Redirect to business setup
// 4. If profile exists: Show dashboard with payment link and history
//
// KEY FEATURES:
// - Generates unique payment URL based on user email
// - QR code for easy mobile payments
// - Copy payment link to clipboard
// - View and edit business bank account info
// - Payment history table
// - Logout functionality
//
// SECURITY:
// - Requires authentication (JWT token)
// - Bank account numbers are masked (shows last 4 digits only)
// - Full account details only shown in edit modal

// ------------------------------------------------------------------------------
// Required Libraries and Components
// ------------------------------------------------------------------------------
// React hooks for state and side effects
import React, { useState, useEffect } from 'react';

// React Router for navigation
import { Link, Navigate } from 'react-router-dom';

// Supabase client for authentication and data
import supabase from './client.jsx';

// QRCode library to generate QR codes
import QRCode from 'qrcode.react';

// Custom security indicator component (shows if setup is complete)
import SecurityIndicator from './SecurityIndicator.jsx';

// API configuration (backend URLs)
import { API_CONFIG } from './config/api.js';

// Global CSS styles
import './global.css';

// ==============================================================================
// DASHBOARD COMPONENT
// ==============================================================================
// Main dashboard component that manages the entire business owner interface
const Dashboard = () => {
  // ----------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------------------------------
  // All the data this component needs to track and display
  
  // userData: Information about the logged-in user (email, id, etc.)
  const [userData, setUserData] = useState(null);
  
  // businessProfile: Bank account information for receiving payments
  // Contains: business_name, routing_number, account_number
  const [businessProfile, setBusinessProfile] = useState(null);
  
  // error: Error messages to display to user
  const [error, setError] = useState('');
  
  // receivedPayments: Array of payments this business has received
  // Each payment has: amount, timestamp, status, etc.
  const [receivedPayments, setReceivedPayments] = useState([]);
  
  // loading: Boolean indicating if data is still being fetched
  // Shows loading screen until dashboard data is ready
  const [loading, setLoading] = useState(true); 
  
  // baseURL: The current website URL (for generating payment links)
  // Example: "https://myapp.netlify.app"
  const [baseURL, setBaseURL] = useState('');
  
  // signedOut: Boolean that triggers redirect to login page
  // Set to true when user clicks logout or session expires
  const [signedOut, setsignedOut] = useState(false);
  
  // needsBusinessSetup: Boolean indicating if user needs to set up their profile
  // If true, redirects to business setup page
  const [needsBusinessSetup, setNeedsBusinessSetup] = useState(false);
  
  // ----------------------------------------------------------------------------
  // Edit Business Profile Modal States
  // ----------------------------------------------------------------------------
  // State for the popup modal where users can edit their bank account info
  
  // showEditModal: Boolean controlling if edit modal is visible
  const [showEditModal, setShowEditModal] = useState(false);
  
  // editLoading: Boolean for loading state during save operation
  const [editLoading, setEditLoading] = useState(false);
  
  // modalLoading: Boolean for loading state when opening modal
  const [modalLoading, setModalLoading] = useState(false);
  
  // editError: Error messages specific to the edit modal
  const [editError, setEditError] = useState('');
  
  // editData: Form data for editing business profile
  // Contains: business_name, routing_number, account_number
  const [editData, setEditData] = useState({
    business_name: '',
    routing_number: '',
    account_number: ''
  });

  // ----------------------------------------------------------------------------
  // EFFECT: FETCH USER DATA ON COMPONENT MOUNT
  // ----------------------------------------------------------------------------
  // This useEffect runs once when the component first loads
  // It fetches all the data needed to display the dashboard
  useEffect(() => {
    // ==========================================================================
    // Fetch User Data Function
    // ==========================================================================
    // Main function that loads user info, business profile, and payment history
    const fetchUserData = async () => {
      try {
        // ----------------------------------------------------------------------
        // Step 1: Check Authentication
        // ----------------------------------------------------------------------
        // Verify user is logged in by checking for active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // If no session or error, user is not logged in
        if (sessionError || !session) {
          setError('Please log in to access the dashboard');
          setLoading(false);
          setsignedOut(true);  // Trigger redirect to login
          return;
        }

        // Extract user object from session
        const user = session.user;
        
        // ----------------------------------------------------------------------
        // Step 2: Create User Data Object
        // ----------------------------------------------------------------------
        // Build a simplified user data object from Supabase auth user
        // We only keep the fields we need for the dashboard
        const userData = {
          email: user.email,           // User's email address
          user_id: user.id,            // Unique user identifier
          created_at: user.created_at  // When account was created
        };

        // Store user data in state (makes it available to render function)
        setUserData(userData);

        // ----------------------------------------------------------------------
        // Step 3: Check for Business Profile
        // ----------------------------------------------------------------------
        // Verify if user has completed business setup (bank account info)
        try {
          console.log('Checking business profile...');
          
          // Make API call to backend to get business profile
          // Include JWT token in Authorization header for authentication
          const businessResponse = await fetch(API_CONFIG.endpoints.businessProfile, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          console.log('Business profile response status:', businessResponse.status);
          
          // Check if request was successful (status 200-299)
          if (businessResponse.ok) {
            // Parse JSON response
            const businessResult = await businessResponse.json();
            console.log('Business profile result:', businessResult);
            
            // If business profile exists, store it and continue
            if (businessResult.business_profile) {
              setBusinessProfile(businessResult.business_profile);
              setNeedsBusinessSetup(false);
              console.log('Business profile found, no setup needed');
            } else {
              // No business profile found - user needs to set one up
              console.log('No business profile found, redirecting to setup');
              setNeedsBusinessSetup(true);
              setLoading(false);
              return; // Stop here - don't load rest of dashboard
            }
          } else {
            // Handle different error status codes
            console.warn('Could not check business profile, status:', businessResponse.status);
            
            // 401 Unauthorized or 403 Forbidden = authentication problem
            if (businessResponse.status === 401 || businessResponse.status === 403) {
              console.log('Authentication issue, signing out');
              await supabase.auth.signOut();
              setsignedOut(true);
              return;
            }
            
            // 404 Not Found = business profile doesn't exist yet
            if (businessResponse.status === 404) {
              console.log('Business profile not found, redirecting to setup');
              setNeedsBusinessSetup(true);
              setLoading(false);
              return;
            }
          }
        } catch (businessError) {
          // If business profile check fails, log warning but continue
          // This ensures dashboard still loads even if business check fails
          console.warn('Error checking business profile:', businessError);
        }

        // Fetch payment history
        try {
          console.log('Fetching payment history...');
          const paymentsResponse = await fetch(API_CONFIG.endpoints.paymentsHistory, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (paymentsResponse.ok) {
            const paymentsResult = await paymentsResponse.json();
            if (paymentsResult.success && paymentsResult.payments) {
              setReceivedPayments(paymentsResult.payments);
              console.log('Payments loaded:', paymentsResult.payments.length);
            }
          } else {
            console.warn('Could not fetch payments, status:', paymentsResponse.status);
          }
        } catch (paymentsError) {
          console.warn('Error fetching payments:', paymentsError);
          // Continue even if payments fail to load
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    fetchUserData();

    const currentURL = window.location.href;
    const index = currentURL.indexOf('/', 8);
    const baseURL = index !== -1 ? currentURL.slice(0, index) : currentURL; 
    setBaseURL(baseURL);
  }, []);

  const handleSignOut = async () => {
    // Sign out from Supabase Auth
    await supabase.auth.signOut();
    sessionStorage.clear();
    setsignedOut(true);
  };

  // Edit business profile functions
  const openEditModal = async () => {
    setShowEditModal(true);
    setModalLoading(true);
    setEditError('');

    // Simulate loading business data with a realistic delay
    setTimeout(() => {
      if (businessProfile) {
        setEditData({
          business_name: businessProfile.business_name,
          routing_number: businessProfile.routing_number,
          account_number: businessProfile.account_number
        });
      }
      setModalLoading(false);
    }, 800); // 800ms delay for realistic loading
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditError('');
    setModalLoading(false);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateEditForm = () => {
    const { business_name, routing_number, account_number } = editData;
    
    if (!business_name.trim()) return false;
    if (!/^\d{9}$/.test(routing_number)) return false;
    if (!/^\d{4,20}$/.test(account_number)) return false;
    
    return true;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    try {
      // Add realistic processing delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setEditError('Authentication required. Please refresh and try again.');
        setEditLoading(false);
        return;
      }

      const response = await fetch(API_CONFIG.endpoints.businessProfile, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editData)
      });

      const result = await response.json();

      if (!response.ok) {
        setEditError(result.error || 'Error updating business information');
        setEditLoading(false);
        return;
      }

      // Add a small delay before closing for smooth UX
      setTimeout(() => {
        setBusinessProfile(result.business_profile);
        setShowEditModal(false);
        setEditLoading(false);
        console.log('Business profile updated successfully');
      }, 500);
      
    } catch (error) {
      console.error('Error updating business profile:', error);
      setEditError('An error occurred while updating your business information');
      setEditLoading(false);
    }
  };

  // Redirect to business setup if needed
  if (needsBusinessSetup) {
    return <Navigate to="/business-setup" />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h1 style={styles.title}>CryptoPay Dashboard</h1>
          <button onClick={handleSignOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
        
        {signedOut && <Navigate to='/login' />}
        
        {loading && (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>Loading...</p>
          </div>
        )}
        
        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}
        
        {userData && (
          <div style={styles.content}>
            <div style={styles.welcomeSection}>
              <div style={styles.welcomeHeader}>
                <h2 style={styles.welcomeTitle}>
                  Welcome, {businessProfile?.business_name || userData.email}
                </h2>
                {businessProfile && (
                  <button 
                    onClick={openEditModal}
                    style={styles.editButton}
                  >
                    Edit Business Info
                  </button>
                )}
              </div>
              <div style={styles.userInfo}>
                {businessProfile && (
                  <>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Business:</span>
                      <span style={styles.infoValue}>{businessProfile.business_name}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Routing:</span>
                      <span style={styles.infoValue}>***{businessProfile.routing_number.slice(-4)}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Account:</span>
                      <span style={styles.infoValue}>***{businessProfile.account_number.slice(-4)}</span>
                    </div>
                  </>
                )}
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Email:</span>
                  <span style={styles.infoValue}>{userData.email}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Member since:</span>
                  <span style={styles.infoValue}>{new Date(userData.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div style={styles.paymentsSection}>
              <h3 style={styles.sectionTitle}>Payment History</h3>
              {receivedPayments.length === 0 ? (
                <div style={styles.noPayments}>
                  <p style={styles.noPaymentsText}>No payments received yet</p>
                  <p style={styles.statusText}>Payment processing system ready.</p>
                </div>
              ) : (
                <div style={styles.paymentsTable}>
                  <div style={styles.tableHeader}>
                    <div style={styles.tableHeaderCell}>Customer Email</div>
                    <div style={styles.tableHeaderCell}>Amount</div>
                    <div style={styles.tableHeaderCell}>Status</div>
                    <div style={styles.tableHeaderCell}>Date</div>
                  </div>
                  {receivedPayments.map((payment) => (
                    <div key={payment.id} style={styles.tableRow}>
                      <div style={styles.tableCell}>
                        {payment.customer_email || 'N/A'}
                      </div>
                      <div style={styles.tableCell}>
                        ${parseFloat(payment.amount).toFixed(2)}
                      </div>
                      <div style={styles.tableCell}>
                        <span style={{
                          ...styles.statusBadge,
                          ...(payment.status === 'completed' ? styles.statusCompleted :
                              payment.status === 'pending' ? styles.statusPending :
                              payment.status === 'expired' ? styles.statusExpired :
                              styles.statusFailed)
                        }}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </div>
                      <div style={styles.tableCell}>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.qrSection}>
              <h3 style={styles.qrTitle}>Customer Payment Portal</h3>
              <p style={styles.qrInstructions}>
                Have your customer scan this QR code to access their payment portal
              </p>
              
              <div style={styles.qrContainer}>
                <div style={styles.qrCodeWrapper}>
                  <QRCode
                    value={`${baseURL}/${userData.email}`}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#2c3e50"
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <div style={styles.qrDetails}>
                  <p style={styles.qrUrl}>{baseURL}/{userData.email}</p>
                  <p style={styles.qrHelper}>
                    Or share this link directly with your customer
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {}
        {showEditModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Edit Business Information</h3>
                <button 
                  onClick={closeEditModal}
                  style={styles.closeButton}
                  disabled={editLoading}
                >
                  ×
                </button>
              </div>

              {modalLoading ? (
                <div style={styles.loadingSection}>
                  <div style={styles.loadingSpinner}></div>
                  <p style={styles.loadingText}>Loading business information...</p>
                </div>
              ) : (
                <>
                  {editError && (
                    <div style={styles.errorAlert}>
                      <span style={styles.errorIcon}>⚠️</span>
                      {editError}
                    </div>
                  )}

                  <form onSubmit={handleEditSubmit} style={styles.editForm}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Business Name</label>
                      <input
                        type="text"
                        name="business_name"
                        value={editData.business_name}
                        onChange={handleEditInputChange}
                        style={styles.input}
                        placeholder="Enter your business name"
                        disabled={editLoading}
                        required
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Routing Number</label>
                      <input
                        type="text"
                        name="routing_number"
                        value={editData.routing_number}
                        onChange={handleEditInputChange}
                        style={styles.input}
                        placeholder="9-digit routing number"
                        maxLength="9"
                        pattern="\d{9}"
                        disabled={editLoading}
                        required
                      />
                      <p style={styles.helperText}>
                        9-digit routing number from your bank
                      </p>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Account Number</label>
                      <input
                        type="text"
                        name="account_number"
                        value={editData.account_number}
                        onChange={handleEditInputChange}
                        style={styles.input}
                        placeholder="Bank account number"
                        maxLength="20"
                        pattern="\d{4,20}"
                        disabled={editLoading}
                        required
                      />
                      <p style={styles.helperText}>
                        Your bank account number (4-20 digits)
                      </p>
                    </div>

                    <div style={styles.modalActions}>
                      <button 
                        type="button"
                        onClick={closeEditModal}
                        style={{
                          ...styles.cancelButton,
                          opacity: editLoading ? 0.5 : 1,
                          cursor: editLoading ? 'not-allowed' : 'pointer'
                        }}
                        disabled={editLoading}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        style={{
                          ...styles.saveButton,
                          opacity: (editLoading || !validateEditForm()) ? 0.5 : 1,
                          cursor: (editLoading || !validateEditForm()) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={editLoading || !validateEditForm()}
                      >
                        {editLoading ? (
                          <div style={styles.buttonLoadingContent}>
                            <div style={styles.buttonSpinner}></div>
                            <span>Processing...</span>
                          </div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#ffffff',
    fontFamily: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
    padding: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  dashboard: {
    maxWidth: '800px',
    width: '100%',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
    boxShadow: '0 20px 40px rgba(139, 69, 19, 0.1)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.95), rgba(205, 133, 63, 0.95))',
    backdropFilter: 'blur(10px)',
    padding: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(139, 69, 19, 0.2)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
    fontFamily: '"Source Sans Pro", sans-serif',
    letterSpacing: '-0.01em',
  },
  signOutButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  content: {
    padding: '32px',
  },
  welcomeSection: {
    background: 'rgba(139, 69, 19, 0.03)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
  },
  welcomeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0,
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  editButton: {
    background: 'rgba(139, 69, 19, 0.1)',
    backdropFilter: 'blur(10px)',
    color: '#8B4513',
    border: '1px solid rgba(139, 69, 19, 0.2)',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  userInfo: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#8B4513',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  infoValue: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#2c3e50',
  },
  paymentsSection: {
    background: 'rgba(139, 69, 19, 0.03)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 16px 0',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  noPayments: {
    textAlign: 'center',
    padding: '24px',
  },
  noPaymentsText: {
    fontSize: '16px',
    color: '#666666',
    margin: '0 0 8px 0',
  },
  statusText: {
    fontSize: '14px',
    color: '#8B4513',
    margin: 0,
    fontWeight: '500',
  },
  paymentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  paymentItem: {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(139, 69, 19, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#8B4513',
  },
  paymentValue: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#2c3e50',
  },
  paymentsTable: {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: '8px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: '16px',
    padding: '16px',
    background: 'rgba(139, 69, 19, 0.08)',
    fontWeight: '600',
    fontSize: '14px',
    color: '#8B4513',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tableHeaderCell: {
    display: 'flex',
    alignItems: 'center',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: '16px',
    padding: '16px',
    borderBottom: '1px solid rgba(139, 69, 19, 0.1)',
    transition: 'background 0.2s ease',
  },
  tableCell: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#2c3e50',
    fontWeight: '500',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusCompleted: {
    background: 'rgba(34, 197, 94, 0.1)',
    color: '#16a34a',
    border: '1px solid rgba(34, 197, 94, 0.2)',
  },
  statusPending: {
    background: 'rgba(234, 179, 8, 0.1)',
    color: '#ca8a04',
    border: '1px solid rgba(234, 179, 8, 0.2)',
  },
  statusExpired: {
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
    border: '1px solid rgba(107, 114, 128, 0.2)',
  },
  statusFailed: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  qrSection: {
    background: 'rgba(139, 69, 19, 0.03)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '32px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
    textAlign: 'center',
  },
  qrTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 8px 0',
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  qrInstructions: {
    fontSize: '16px',
    color: '#666666',
    margin: '0 0 32px 0',
    lineHeight: '1.5',
  },
  qrContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  qrCodeWrapper: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
    boxShadow: '0 8px 32px rgba(139, 69, 19, 0.1)',
  },
  qrDetails: {
    maxWidth: '400px',
  },
  qrUrl: {
    fontSize: '14px',
    fontFamily: '"IBM Plex Mono", monospace',
    color: '#8B4513',
    background: 'rgba(139, 69, 19, 0.05)',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(139, 69, 19, 0.1)',
    margin: '0 0 8px 0',
    wordBreak: 'break-all',
  },
  qrHelper: {
    fontSize: '14px',
    color: '#666666',
    margin: 0,
  },
  loadingContainer: {
    padding: '48px',
    textAlign: 'center',
  },
  errorAlert: {
    background: 'rgba(220, 38, 38, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(220, 38, 38, 0.2)',
    borderRadius: '8px',
    padding: '16px',
    margin: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: '16px',
  },
  // Loading Animation Styles
  loadingSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
    gap: '20px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(139, 69, 19, 0.1)',
    borderLeft: '4px solid #8B4513',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#8B4513',
    fontSize: '16px',
    fontFamily: 'Source Sans Pro, sans-serif',
    margin: 0,
    fontWeight: '500',
  },
  buttonLoadingContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderLeft: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)', // Safari support
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)', // Safari support
    borderRadius: '16px',
    border: '1px solid rgba(139, 69, 19, 0.2)',
    boxShadow: '0 32px 64px rgba(139, 69, 19, 0.3)',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    borderBottom: '1px solid rgba(139, 69, 19, 0.15)',
    background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.08), rgba(205, 133, 63, 0.08))',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '16px 16px 0 0',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0,
    fontFamily: '"Source Sans Pro", sans-serif',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#666666',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s ease',
  },
  editForm: {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '1px solid #e1e5e9',
    borderRadius: '4px',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
    background: '#ffffff',
  },
  helperText: {
    fontSize: '12px',
    color: '#666666',
    margin: 0,
    fontStyle: 'italic',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    background: 'transparent',
    color: '#666666',
    border: '1px solid #e1e5e9',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  saveButton: {
    background: '#8B4513',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    fontFamily: 'inherit',
  },
};

export default Dashboard;

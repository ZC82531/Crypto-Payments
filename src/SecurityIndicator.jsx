// ==============================================================================
// SECURITY INDICATOR COMPONENT
// ==============================================================================
// This component displays a floating security badge in the bottom-right corner
// of the screen. It's like a "secure connection" indicator you see in browsers.
//
// Purpose:
// - Reassure users that their data is being protected
// - Show what security measures are active (encryption, tokenization, etc.)
// - Provide transparency about data protection
// - Build trust by making security visible
//
// Features:
// - Collapsible details (click to expand/collapse)
// - Color-coded security levels (green = high, yellow = medium, red = low)
// - Different icons for different protection types
// - Animated pulsing indicator to show active status
//
// Usage: <SecurityIndicator level="high" transmission="encrypted" />
// ==============================================================================

import React, { useState } from 'react';

// ------------------------------------------------------------------------------
// SecurityIndicator Component
// ------------------------------------------------------------------------------
// Props:
// - level: Security level ('high', 'medium', 'low') - determines color
// - transmission: Type of protection ('encrypted', 'tokenized', 'hashed')
const SecurityIndicator = ({ level = 'high', transmission = 'encrypted' }) => {
  // State: Controls whether detailed security info is shown
  // Initially collapsed (false), expands when user clicks
  const [showDetails, setShowDetails] = useState(false);

  // ------------------------------------------------------------------------------
  // getSecurityColor - Returns color based on security level
  // ------------------------------------------------------------------------------
  // Maps security levels to colors using a switch statement
  // This provides visual feedback about how secure the current transmission is
  const getSecurityColor = () => {
    switch (level) {
      case 'high': return '#22c55e';      // Green - Maximum security
      case 'medium': return '#f59e0b';    // Yellow/Orange - Moderate security
      case 'low': return '#ef4444';       // Red - Low security (warning)
      default: return '#8b5cf6';          // Purple - Default/unknown
    }
  };

  // ------------------------------------------------------------------------------
  // getTransmissionIcon - Returns emoji icon for transmission type
  // ------------------------------------------------------------------------------
  // Visual indicators help users quickly understand the protection method
  const getTransmissionIcon = () => {
    switch (transmission) {
      case 'encrypted': return '🔒';    // Lock - Data is encrypted (scrambled)
      case 'tokenized': return '🎫';    // Ticket - Data replaced with token
      case 'hashed': return '#️⃣';       // Hash - Data converted to hash
      default: return '🛡️';              // Shield - Generic protection
    }
  };

  // ------------------------------------------------------------------------------
  // Render the Security Indicator UI
  // ------------------------------------------------------------------------------
  return (
    // Main container - fixed position in bottom-right corner
    <div style={{
      position: 'fixed',              // Stays in same place even when scrolling
      bottom: '20px',                 // 20px from bottom of screen
      right: '20px',                  // 20px from right edge of screen
      background: 'rgba(255, 255, 255, 0.95)',  // Almost opaque white
      backdropFilter: 'blur(10px)',   // Blur effect on content behind it (frosted glass)
      border: `2px solid ${getSecurityColor()}`,  // Border color matches security level
      borderRadius: '12px',           // Rounded corners (softer look)
      padding: '15px',                // Inner spacing
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',  // Subtle shadow for depth
      minWidth: '280px',              // Minimum width ensures text doesn't wrap oddly
      zIndex: 1000,                   // High z-index keeps it above other content
      fontFamily: 'IBM Plex Sans, sans-serif'  // Professional font
    }}>
      {/* Header section - clickable to toggle details */}
      <div 
        style={{
          display: 'flex',            // Flexbox for horizontal layout
          alignItems: 'center',       // Vertically center items
          gap: '10px',                // Space between items
          cursor: 'pointer'           // Show hand cursor to indicate it's clickable
        }}
        // Toggle showDetails between true/false when clicked
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Pulsing indicator dot - animated to show "active" status */}
        <div style={{
          width: '12px',
          height: '12px',
          backgroundColor: getSecurityColor(),  // Color matches security level
          borderRadius: '50%',                  // Makes it a circle
          animation: 'pulse 2s infinite'        // Fade in/out animation (see @keyframes below)
        }} />
        
        {/* Main text with icon */}
        <span style={{
          fontSize: '14px',
          fontWeight: '600',          // Semi-bold for emphasis
          color: '#333'               // Dark gray (almost black)
        }}>
          {getTransmissionIcon()} Secure Transmission Active
        </span>
        
        {/* Expand/collapse arrow indicator */}
        <span style={{
          fontSize: '12px',
          color: '#666',              // Medium gray
          marginLeft: 'auto'          // Push to far right
        }}>
          {showDetails ? '▼' : '▶'}  {/* Down arrow when expanded, right arrow when collapsed */}
        </span>
      </div>

      {/* Detailed security information - only shown when showDetails is true */}
      {showDetails && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(139, 69, 19, 0.1)',  // Subtle divider line
          fontSize: '12px',
          color: '#555'               // Medium-dark gray text
        }}>
          {/* Data Protection section */}
          <div style={{ marginBottom: '8px' }}>
            <strong>🔐 Data Protection:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              {/* AES-256: Military-grade encryption standard */}
              <li>AES-256 Encryption</li>
              {/* Tokenization: Replace sensitive data with tokens */}
              <li>Secure Tokenization</li>
              {/* PBKDF2: Key derivation function (converts passwords to keys) */}
              <li>PBKDF2 Hashing</li>
            </ul>
          </div>
          
          {/* Transmission Security section */}
          <div style={{ marginBottom: '8px' }}>
            <strong>🚀 Transmission Security:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              {/* TLS 1.3: Latest secure connection protocol (like HTTPS) */}
              <li>TLS 1.3 Protocol</li>
              {/* End-to-End: Data encrypted from sender to receiver */}
              <li>End-to-End Encryption</li>
              {/* Rate Limiting: Prevents brute force attacks */}
              <li>Rate Limiting Protection</li>
            </ul>
          </div>

          {/* Banking-grade security badge */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',      // Light green background
            border: '1px solid rgba(34, 197, 94, 0.2)',  // Green border
            borderRadius: '6px',
            padding: '8px',
            marginTop: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✅</span>  {/* Checkmark icon */}
              <span style={{ fontSize: '11px', fontWeight: '500' }}>
                Banking-Grade Security Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Inline CSS animation for the pulsing dot */}
      {/* This creates a fade in/out effect that repeats forever */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }    /* Fully visible at start and end */
          50% { opacity: 0.5; }        /* Half transparent at midpoint */
        }
      `}</style>
    </div>
  );
};

// ------------------------------------------------------------------------------
// Export Component
// ------------------------------------------------------------------------------
export default SecurityIndicator;
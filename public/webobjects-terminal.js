/**
 * AbilityPay WebObjects Payment Terminal Embed Script
 * Embeddable script for external websites
 * 
 * Usage:
 * <script src="https://your-domain.com/webobjects-terminal.js"></script>
 * <div id="abilitypay-terminal" data-config='{"providerId":"...","amount":100,"serviceCode":"01_001_0107_1_1"}'></div>
 */

(function() {
  'use strict';

  // Terminal configuration from data attributes
  function getTerminalConfig(element) {
    const configAttr = element.getAttribute('data-config');
    if (!configAttr) {
      throw new Error('data-config attribute is required');
    }

    try {
      return JSON.parse(configAttr);
    } catch (e) {
      throw new Error('Invalid JSON in data-config attribute');
    }
  }

  // Create iframe for terminal
  function createTerminal(element, config) {
    const iframe = document.createElement('iframe');
    iframe.id = 'abilitypay-terminal-iframe';
    iframe.src = config.apiBaseUrl || 'https://your-domain.com/abilitypay/terminal';
    iframe.style.width = '100%';
    iframe.style.minHeight = '500px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.allow = 'payment';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';

    // Pass configuration via URL params
    const params = new URLSearchParams();
    params.append('providerId', config.providerId);
    params.append('amount', config.amount);
    if (config.serviceCode) params.append('serviceCode', config.serviceCode);
    if (config.serviceDescription) params.append('serviceDescription', config.serviceDescription);
    if (config.categoryId) params.append('categoryId', config.categoryId);
    if (config.workerId) params.append('workerId', config.workerId);
    if (config.serviceType) params.append('serviceType', config.serviceType);
    if (config.paymentMethods) params.append('paymentMethods', JSON.stringify(config.paymentMethods));
    if (config.theme) params.append('theme', config.theme);
    if (config.size) params.append('size', config.size);
    if (config.showLogo !== undefined) params.append('showLogo', config.showLogo);
    if (config.brandName) params.append('brandName', config.brandName);
    if (config.apiBaseUrl) params.append('apiBaseUrl', config.apiBaseUrl);

    iframe.src += '?' + params.toString();
    
    element.appendChild(iframe);
    
    // Handle messages from iframe
    window.addEventListener('message', function(event) {
      if (event.data.type === 'abilitypay-payment-success') {
        if (config.onSuccess) {
          config.onSuccess(event.data.transactionId, event.data.result);
        }
        if (config.onComplete) {
          config.onComplete(event.data);
        }
      } else if (event.data.type === 'abilitypay-payment-error') {
        if (config.onError) {
          config.onError(event.data.error);
        }
      } else if (event.data.type === 'abilitypay-payment-cancel') {
        if (config.onCancel) {
          config.onCancel();
        }
      }
    });
  }

  // Initialize terminals when DOM is ready
  function initTerminals() {
    const terminals = document.querySelectorAll('[id*="abilitypay-terminal"], [class*="abilitypay-terminal"]');
    
    terminals.forEach(function(element) {
      try {
        const config = getTerminalConfig(element);
        createTerminal(element, config);
      } catch (error) {
        console.error('AbilityPay Terminal initialization error:', error);
        element.innerHTML = '<div style="padding: 20px; color: red;">Error: ' + error.message + '</div>';
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTerminals);
  } else {
    initTerminals();
  }

  // Expose API for programmatic use
  window.AbilityPayTerminal = {
    init: function(elementId, config) {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element with id "' + elementId + '" not found');
      }
      createTerminal(element, config);
    },
    destroy: function(elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        const iframe = element.querySelector('#abilitypay-terminal-iframe');
        if (iframe) {
          iframe.remove();
        }
      }
    }
  };

})();

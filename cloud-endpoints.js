// ════════════════════════════════════════════════════════════════════════════
// FORTIZED × SWIFTAW CLOUD INTEGRATION
// Cloud Authentication Endpoints
// ════════════════════════════════════════════════════════════════════════════

const {
  validateCloudToken,
  generateFortizedToken,
  generateLinkingToken,
  rateLimitMiddleware,
} = require('./cloud-auth');

// ──────────────────────────────────────────────────────────────────────────
// ENDPOINT 1: Cloud Callback (OAuth Return)
// ──────────────────────────────────────────────────────────────────────────
// POST /api/auth/cloud-callback
// Purpose: User comes back from Cloud login with JWT token
// Input: { cloud_token: string, cloud_user_id?: string }
// Output: Fortized token + account selection

async function handleCloudCallback(req, res, sb) {
  return async (request, response) => {
    try {
      const { cloud_token, cloud_user_id } = request.body;

      if (!cloud_token) {
        return response.status(400).json({
          error: 'missing_token',
          message: 'cloud_token is required',
        });
      }

      // Validate Cloud JWT
      const validation = await validateCloudToken(cloud_token);
      if (!validation.valid) {
        return response.status(401).json({
          error: 'invalid_token',
          message: validation.error,
        });
      }

      const cloudUserId = validation.cloudUserId;
      const cloudEmail = validation.email;

      // Find all Fortized accounts linked to this Cloud user
      const { data: linkedAccounts, error: queryError } = await sb
        .from('cloud_account_links')
        .select('*')
        .eq('cloud_user_id', cloudUserId)
        .eq('is_active', true);

      if (queryError) {
        console.error('[Cloud Callback] Query error:', queryError);
        return response.status(500).json({
          error: 'database_error',
          message: 'Failed to fetch linked accounts',
        });
      }

      // Case 1: No accounts linked - prompt to create/link
      if (!linkedAccounts || linkedAccounts.length === 0) {
        return response.json({
          action: 'create_or_link',
          cloud_user_id: cloudUserId,
          email: cloudEmail,
          message: 'No Fortized accounts found. Create new or link existing.',
        });
      }

      // Case 2: One account - log them in directly
      if (linkedAccounts.length === 1) {
        const account = linkedAccounts[0];
        const fortizedToken = generateFortizedToken(account);

        // Update last_login
        await sb
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', account.fortized_user_id);

        return response.json({
          success: true,
          action: 'login',
          fortized_token: fortizedToken,
          subaccount_id: account.subaccount_id,
          username: account.username,
          email: account.email,
          expires_in: 86400,
        });
      }

      // Case 3: Multiple accounts - show account picker
      const accountOptions = linkedAccounts.map(acc => ({
        subaccount_id: acc.subaccount_id,
        username: acc.username,
        email: acc.email,
        created_at: acc.created_at,
      }));

      return response.json({
        success: true,
        action: 'select_account',
        cloud_user_id: cloudUserId,
        multiple_accounts: true,
        accounts: accountOptions,
        message: 'Multiple accounts found. Please select one.',
      });
    } catch (error) {
      console.error('[Cloud Callback] Error:', error);
      return response.status(500).json({
        error: 'internal_error',
        message: error.message,
      });
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// ENDPOINT 2: Link to Cloud (Create New Account)
// ──────────────────────────────────────────────────────────────────────────
// POST /api/accounts/link-to-cloud
// Purpose: Create new Fortized account linked to Cloud user
// Input: { cloud_user_id, username, email, action: 'create' }
// Output: { success, subaccount_id, ... }

async function handleLinkToCloud(req, res, sb) {
  return async (request, response) => {
    try {
      const { cloud_user_id, username, email, action } = request.body;

      // Validation
      if (!cloud_user_id || !username) {
        return response.status(400).json({
          error: 'missing_fields',
          message: 'cloud_user_id and username are required',
        });
      }

      // Check if username already exists
      const { data: existingUser } = await sb
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        return response.status(409).json({
          error: 'username_exists',
          message: `Username '${username}' already exists in Fortized`,
          suggestion: `${username}_${Math.random().toString(36).substring(7)}`,
        });
      }

      // Create new Fortized user
      const { data: newUser, error: createError } = await sb
        .from('users')
        .insert({
          username: username.toLowerCase(),
          email: email || null,
          cloud_user_id: cloud_user_id,
          is_linked_to_cloud: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('[Link to Cloud] User creation error:', createError);
        return response.status(500).json({
          error: 'user_creation_failed',
          message: createError.message,
        });
      }

      // Link account in cloud_account_links table
      const subaccountId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const { data: linkData, error: linkError } = await sb
        .from('cloud_account_links')
        .insert({
          cloud_user_id: cloud_user_id,
          fortized_user_id: newUser.id,
          subaccount_id: subaccountId,
          username: newUser.username,
          email: newUser.email,
          linked_by: 'cloud',
          is_active: true,
        })
        .select()
        .single();

      if (linkError) {
        console.error('[Link to Cloud] Link creation error:', linkError);
        return response.status(500).json({
          error: 'link_creation_failed',
          message: linkError.message,
        });
      }

      return response.json({
        success: true,
        subaccount_id: subaccountId,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at,
        linked_to_cloud: true,
      });
    } catch (error) {
      console.error('[Link to Cloud] Error:', error);
      return response.status(500).json({
        error: 'internal_error',
        message: error.message,
      });
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// ENDPOINT 3: Get Cloud User's Fortized Accounts
// ──────────────────────────────────────────────────────────────────────────
// GET /api/accounts/{cloud_user_id}
// Purpose: Fetch all Fortized accounts linked to a Cloud user
// Output: Array of subaccounts with metadata

async function handleGetAccounts(req, res, sb) {
  return async (request, response) => {
    try {
      const { cloud_user_id } = request.params;

      if (!cloud_user_id) {
        return response.status(400).json({
          error: 'missing_field',
          message: 'cloud_user_id is required',
        });
      }

      const { data: accounts, error: queryError } = await sb
        .from('cloud_account_links')
        .select(`
          subaccount_id,
          username,
          email,
          created_at,
          linked_at,
          is_active,
          fortized_user_id
        `)
        .eq('cloud_user_id', cloud_user_id)
        .eq('is_active', true);

      if (queryError) {
        console.error('[Get Accounts] Query error:', queryError);
        return response.status(500).json({
          error: 'database_error',
          message: 'Failed to fetch accounts',
        });
      }

      // Get last_login for each account
      const accountsWithLastLogin = await Promise.all(
        (accounts || []).map(async (acc) => {
          const { data: user } = await sb
            .from('users')
            .select('last_login')
            .eq('id', acc.fortized_user_id)
            .single();

          return {
            subaccount_id: acc.subaccount_id,
            username: acc.username,
            email: acc.email,
            created_at: acc.created_at,
            last_login: user?.last_login || null,
            role: 'player', // Could be extended for roles
          };
        })
      );

      return response.json({
        success: true,
        cloud_user_id,
        accounts: accountsWithLastLogin,
      });
    } catch (error) {
      console.error('[Get Accounts] Error:', error);
      return response.status(500).json({
        error: 'internal_error',
        message: error.message,
      });
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// ENDPOINT 4: Switch Subaccount
// ──────────────────────────────────────────────────────────────────────────
// POST /api/auth/switch-subaccount
// Purpose: User switches to a different Fortized account
// Input: { cloud_user_id, subaccount_id }
// Output: { success, fortized_token, ... }

async function handleSwitchSubaccount(req, res, sb) {
  return async (request, response) => {
    try {
      const { cloud_user_id, subaccount_id } = request.body;

      if (!cloud_user_id || !subaccount_id) {
        return response.status(400).json({
          error: 'missing_fields',
          message: 'cloud_user_id and subaccount_id are required',
        });
      }

      // Find the account to switch to
      const { data: account, error: queryError } = await sb
        .from('cloud_account_links')
        .select('*')
        .eq('cloud_user_id', cloud_user_id)
        .eq('subaccount_id', subaccount_id)
        .eq('is_active', true)
        .single();

      if (queryError || !account) {
        return response.status(404).json({
          error: 'account_not_found',
          message: 'Account not found or not linked to this Cloud user',
        });
      }

      // Generate new Fortized token for this account
      const fortizedToken = generateFortizedToken(account);

      // Update last_login
      await sb
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', account.fortized_user_id);

      return response.json({
        success: true,
        fortized_token: fortizedToken,
        subaccount_id: account.subaccount_id,
        username: account.username,
        email: account.email,
        expires_in: 86400,
      });
    } catch (error) {
      console.error('[Switch Subaccount] Error:', error);
      return response.status(500).json({
        error: 'internal_error',
        message: error.message,
      });
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// ENDPOINT 5: Disconnect / Unlink Account
// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/accounts/{cloud_user_id}/{subaccount_id}
// Purpose: Remove Fortized account from Cloud
// Output: { success: true }

async function handleDisconnectAccount(req, res, sb) {
  return async (request, response) => {
    try {
      const { cloud_user_id, subaccount_id } = request.params;

      if (!cloud_user_id || !subaccount_id) {
        return response.status(400).json({
          error: 'missing_fields',
          message: 'cloud_user_id and subaccount_id are required',
        });
      }

      // Mark as inactive rather than deleting (audit trail)
      const { error: updateError } = await sb
        .from('cloud_account_links')
        .update({ is_active: false })
        .eq('cloud_user_id', cloud_user_id)
        .eq('subaccount_id', subaccount_id);

      if (updateError) {
        console.error('[Disconnect Account] Update error:', updateError);
        return response.status(500).json({
          error: 'disconnect_failed',
          message: updateError.message,
        });
      }

      return response.json({
        success: true,
        message: 'Account disconnected from Cloud',
      });
    } catch (error) {
      console.error('[Disconnect Account] Error:', error);
      return response.status(500).json({
        error: 'internal_error',
        message: error.message,
      });
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// ENDPOINT 6: Verify Cloud Token (Utility)
// ──────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-cloud-token?token={jwt}
// Purpose: Validate a Cloud JWT token
// Output: { valid: true/false, ... }

async function handleVerifyCloudToken(req, res) {
  return async (request, response) => {
    try {
      const token = request.query.token;

      if (!token) {
        return response.status(400).json({
          error: 'missing_token',
          message: 'token query parameter is required',
        });
      }

      const validation = await validateCloudToken(token);

      if (!validation.valid) {
        return response.status(401).json({
          valid: false,
          error: validation.error,
        });
      }

      return response.json({
        valid: true,
        user_id: validation.cloudUserId,
        email: validation.cloudEmail,
        iat: validation.iat,
        exp: validation.exp,
      });
    } catch (error) {
      console.error('[Verify Token] Error:', error);
      return response.status(500).json({
        error: 'internal_error',
        message: error.message,
      });
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// ENDPOINT 7: Get Public Key (Utility)
// ──────────────────────────────────────────────────────────────────────────
// GET /api/auth/public-key
// Purpose: Get Fortized's public key for Cloud to validate our tokens
// Output: { alg, kty, key }

async function handleGetPublicKey(req, res) {
  return async (request, response) => {
    // For now, return a placeholder
    // In production, this would be your RSA public key
    return response.json({
      alg: 'HS256',
      kty: 'oct',
      key: process.env.FORTIZED_JWT_PUBLIC_KEY || 'fortized-public-key-placeholder',
    });
  };
}

// ──────────────────────────────────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────────────────────────────────

module.exports = {
  handleCloudCallback,
  handleLinkToCloud,
  handleGetAccounts,
  handleSwitchSubaccount,
  handleDisconnectAccount,
  handleVerifyCloudToken,
  handleGetPublicKey,
};

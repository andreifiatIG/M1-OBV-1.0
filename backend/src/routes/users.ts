import express from 'express';
import { authenticate } from '../middleware/auth';
import { clerkClient } from '@clerk/clerk-sdk-node';

const router = express.Router();

// Get all users with their roles
router.get('/', authenticate, async (req, res) => {
  try {
    // Only allow admin and manager roles to view users
    const requestingUser = req.user;
    if (!requestingUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, allow all users to test the functionality
    // TODO: Implement proper role checking
    // const userRole = requestingUser.role;
    // if (!['admin', 'manager'].includes(userRole)) {
    //   return res.status(403).json({ error: 'Insufficient permissions' });
    // }

    // Fetch users from Clerk
    const users = await clerkClient.users.getUserList();
    
    // Transform users data
    const usersData = (users as any).data ? (users as any).data.map((user: any) => ({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.emailAddresses[0]?.emailAddress || '',
      role: user.publicMetadata?.role || user.unsafeMetadata?.role || 'owner',
      createdAt: user.createdAt,
      lastSignIn: user.lastSignInAt || user.createdAt,
      profileImageUrl: user.imageUrl,
      // Add villa count if we have it
      villaCount: 0, // TODO: Implement villa counting per user
    })) : (users as any).map((user: any) => ({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.emailAddresses[0]?.emailAddress || '',
      role: user.publicMetadata?.role || user.unsafeMetadata?.role || 'owner',
      createdAt: user.createdAt,
      lastSignIn: user.lastSignInAt || user.createdAt,
      profileImageUrl: user.imageUrl,
      // Add villa count if we have it
      villaCount: 0, // TODO: Implement villa counting per user
    }));

    res.json({
      success: true,
      data: {
        users: usersData,
        total: usersData.length
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Update user role
router.patch('/:userId/role', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate role
    const allowedRoles = ['owner', 'manager', 'admin', 'staff'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // For now, allow all users to test the functionality
    // TODO: Only allow admins to change roles
    // const requestingUserRole = requestingUser.role;
    // if (requestingUserRole !== 'admin') {
    //   return res.status(403).json({ error: 'Only administrators can update user roles' });
    // }

    // Update user metadata in Clerk
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role: role
      }
    });

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});

// Get user's villa count
router.get('/:userId/villas/count', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Implement actual villa counting query
    // For now, return 0
    const count = 0;

    res.json({
      success: true,
      data: {
        count
      }
    });
  } catch (error) {
    console.error('Error counting user villas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to count user villas'
    });
  }
});

// TEST ENDPOINT: Set current user as admin (for development/testing)
router.post('/make-admin', authenticate, async (req, res) => {
  try {
    const requestingUser = req.user;
    if (!requestingUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update current user to admin role
    await clerkClient.users.updateUser(requestingUser.id, {
      publicMetadata: {
        role: 'admin'
      }
    });

    res.json({
      success: true,
      message: 'User role updated to admin successfully',
      userId: requestingUser.id
    });
  } catch (error) {
    console.error('Error making user admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});

// TEST ENDPOINT: Set current user as manager (for development/testing)
router.post('/make-manager', authenticate, async (req, res) => {
  try {
    const requestingUser = req.user;
    if (!requestingUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update current user to manager role
    await clerkClient.users.updateUser(requestingUser.id, {
      publicMetadata: {
        role: 'manager'
      }
    });

    res.json({
      success: true,
      message: 'User role updated to manager successfully',
      userId: requestingUser.id
    });
  } catch (error) {
    console.error('Error making user manager:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});

// TEST ENDPOINT: Reset current user to owner role (for development/testing)
router.post('/make-owner', authenticate, async (req, res) => {
  try {
    const requestingUser = req.user;
    if (!requestingUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update current user to owner role
    await clerkClient.users.updateUser(requestingUser.id, {
      publicMetadata: {
        role: 'owner'
      }
    });

    res.json({
      success: true,
      message: 'User role updated to owner successfully',
      userId: requestingUser.id
    });
  } catch (error) {
    console.error('Error making user owner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});

export default router;
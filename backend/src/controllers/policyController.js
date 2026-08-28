import ContainmentPolicy from '../models/ContainmentPolicy.js';
import { writeAuditLog } from '../utils/auditWriter.js';

// @desc    Get all containment policies
// @route   GET /api/v1/policies
export const getPolicies = async (req, res) => {
  try {
    const policies = await ContainmentPolicy.find()
      .populate('createdBy', 'username email')
      .sort({ priority: 1, createdAt: -1 });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create a new containment policy
// @route   POST /api/v1/policies
export const createPolicy = async (req, res) => {
  try {
    const { name, description, priority, conditions, actions, enabled } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Policy name is required.' });
    }

    const policy = await ContainmentPolicy.create({
      name,
      description,
      priority: priority !== undefined ? priority : 100,
      conditions: conditions || {},
      actions: actions || {},
      enabled: enabled !== undefined ? enabled : true,
      createdBy: req.user._id
    });

    const logEntry = {
      action: 'POLICY_CREATED',
      actor: req.user._id,
      actorDisplay: req.user.username,
      details: { policyId: policy._id, name: policy.name, conditions: policy.conditions }
    };
    await writeAuditLog(logEntry);

    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update a containment policy
// @route   PUT /api/v1/policies/:id
export const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await ContainmentPolicy.findByIdAndUpdate(id, req.body, { new: true });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const logEntry = {
      action: 'POLICY_UPDATED',
      actor: req.user._id,
      actorDisplay: req.user.username,
      details: { policyId: policy._id, name: policy.name, enabled: policy.enabled }
    };
    await writeAuditLog(logEntry);

    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a containment policy
// @route   DELETE /api/v1/policies/:id
export const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await ContainmentPolicy.findByIdAndDelete(id);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const logEntry = {
      action: 'POLICY_DELETED',
      actor: req.user._id,
      actorDisplay: req.user.username,
      details: { policyId: id, name: policy.name }
    };
    await writeAuditLog(logEntry);

    res.json({ success: true, message: 'Policy deleted', policyId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

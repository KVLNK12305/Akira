/**
 * Human Approval Policy (§12 Policy E, §13)
 * 
 * Privileged actions (like containment execution or elevated simulation) require
 * a fresh, non-reusable approval token signed by an administrator.
 */

export const verifyApprovalToken = async ({ approvalToken, targetKeyId, action }) => {
  if (!approvalToken) {
    return {
      approved: false,
      reason: 'Approval token missing for privileged operation'
    };
  }

  // Tokens must be fresh and single-use
  // In v1, containment tools are not exposed to AI agents.
  return {
    approved: false,
    reason: 'Containment tools require interactive human-in-the-loop admin approval in SOC console'
  };
};

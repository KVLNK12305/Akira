import { executeSimulationAttack } from '../../services/nhiService.js';
import { validateSimulationInput } from '../schemas/simulation.schema.js';
import { createFailClosedError } from '../policies/failure-policy.js';

/**
 * MCP Tool Handler: simulate_attack
 * 
 * Enforces strict simulation-eligibility guardrail (§4-8).
 * Runs through the exact live AI Risk Sentinel pipeline and real containment triggers.
 */
export const handleSimulateAttack = async (rawArgs, context = {}) => {
  const { keyId, attackScenario } = validateSimulationInput(rawArgs);

  try {
    const result = await executeSimulationAttack({
      keyId,
      attackScenario,
      actor: {
        id: context.caller?.id,
        name: context.caller?.name || 'AI-MCP-Agent'
      }
    });

    return {
      simulationSuccess: true,
      scenario: result.scenario,
      targetMachine: result.targetMachine,
      targetKeyId: result.targetKeyId,
      evaluation: {
        riskScore: result.assessment.riskScore,
        riskLevel: result.assessment.riskLevel,
        action: result.assessment.action,
        containmentActions: result.assessment.containmentActions || [],
        policyTriggered: result.assessment.policyTriggered ? {
          name: result.assessment.policyTriggered.name,
          id: result.assessment.policyTriggered._id
        } : null,
        signalsDetected: (result.assessment.signals || []).map(s => ({
          signal: s.signal,
          weight: s.weight,
          details: s.details
        }))
      }
    };
  } catch (err) {
    if (err.code === 'TARGET_NOT_SIMULATION_ELIGIBLE') {
      const guardErr = new Error(`Simulated attack denied: Target identity [${err.machineName || keyId}] is not flagged simulation-eligible.`);
      guardErr.code = 'TARGET_NOT_SIMULATION_ELIGIBLE';
      throw guardErr;
    }
    throw createFailClosedError('DATA_STORE', err);
  }
};

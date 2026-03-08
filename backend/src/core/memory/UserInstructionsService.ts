import {
  userInstructionsRepository,
  InstructionCategory,
  InstructionSource,
  UserInstruction,
  ToolPreference,
} from '../../db/repositories/UserInstructionsRepository';

export class UserInstructionsService {

  async add(
    instruction: string,
    category: InstructionCategory = 'general',
    source: InstructionSource = 'explicit'
  ): Promise<UserInstruction> {
    return userInstructionsRepository.add(instruction, category, source);
  }

  async getAll(): Promise<UserInstruction[]> {
    return userInstructionsRepository.getAll();
  }

  async toggle(id: string, active: boolean): Promise<UserInstruction | null> {
    return userInstructionsRepository.setActive(id, active);
  }

  async delete(id: string): Promise<void> {
    return userInstructionsRepository.delete(id);
  }

  async getToolPreferences(): Promise<ToolPreference[]> {
    return userInstructionsRepository.getToolPreferences();
  }

  async setToolEnabled(toolName: string, enabled: boolean): Promise<void> {
    return userInstructionsRepository.setToolEnabled(toolName, enabled);
  }

  async getEnabledTools(): Promise<string[]> {
    return userInstructionsRepository.getEnabledTools();
  }

  /**
   * Định dạng active instructions để inject vào system prompt.
   * Trả về chuỗi rỗng nếu không có instruction nào.
   */
  async formatForSystemPrompt(): Promise<string> {
    const instructions = await userInstructionsRepository.getActive();
    if (instructions.length === 0) return '';

    const byCategory: Record<string, string[]> = {};
    for (const inst of instructions) {
      if (!byCategory[inst.category]) byCategory[inst.category] = [];
      byCategory[inst.category].push(inst.instruction);
    }

    const lines: string[] = [];
    for (const [cat, items] of Object.entries(byCategory)) {
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      lines.push(`[${label}]`);
      items.forEach((i) => lines.push(`  - ${i}`));
    }

    return lines.join('\n');
  }
}

export const userInstructionsService = new UserInstructionsService();

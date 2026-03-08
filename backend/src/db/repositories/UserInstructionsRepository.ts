import { query, queryOne } from '../connection';

export type InstructionCategory = 'tone' | 'format' | 'topic' | 'general';
export type InstructionSource = 'explicit' | 'learned';

export interface UserInstruction {
  id: string;
  instruction: string;
  category: InstructionCategory;
  active: boolean;
  source: InstructionSource;
  created_at: Date;
  updated_at: Date;
}

export interface ToolPreference {
  tool_name: string;
  enabled: boolean;
  updated_at: Date;
}

export class UserInstructionsRepository {

  // ─── Instructions ─────────────────────────────────────────────────────────

  async add(
    instruction: string,
    category: InstructionCategory = 'general',
    source: InstructionSource = 'explicit'
  ): Promise<UserInstruction> {
    const rows = await query<UserInstruction>(
      `INSERT INTO user_instructions (instruction, category, source)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [instruction, category, source]
    );
    return rows[0];
  }

  async getActive(): Promise<UserInstruction[]> {
    return query<UserInstruction>(
      `SELECT * FROM user_instructions
       WHERE active = true
       ORDER BY created_at ASC`
    );
  }

  async getAll(): Promise<UserInstruction[]> {
    return query<UserInstruction>(
      `SELECT * FROM user_instructions ORDER BY created_at DESC`
    );
  }

  async setActive(id: string, active: boolean): Promise<UserInstruction | null> {
    return queryOne<UserInstruction>(
      `UPDATE user_instructions
       SET active = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, active]
    );
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM user_instructions WHERE id = $1', [id]);
  }

  // ─── Tool Preferences ─────────────────────────────────────────────────────

  async getToolPreferences(): Promise<ToolPreference[]> {
    return query<ToolPreference>(
      `SELECT * FROM tool_preferences ORDER BY tool_name`
    );
  }

  async setToolEnabled(toolName: string, enabled: boolean): Promise<void> {
    await query(
      `INSERT INTO tool_preferences (tool_name, enabled, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tool_name) DO UPDATE SET enabled = $2, updated_at = NOW()`,
      [toolName, enabled]
    );
  }

  async getEnabledTools(): Promise<string[]> {
    const rows = await query<ToolPreference>(
      `SELECT tool_name FROM tool_preferences WHERE enabled = true`
    );
    return rows.map((r) => r.tool_name);
  }
}

export const userInstructionsRepository = new UserInstructionsRepository();

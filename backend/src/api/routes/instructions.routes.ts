import { FastifyInstance } from 'fastify';
import { userInstructionsService } from '../../core/memory/UserInstructionsService';
import { InstructionCategory } from '../../db/repositories/UserInstructionsRepository';

export async function instructionsRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/instructions — lấy tất cả instructions
  app.get('/instructions', async (_request, reply) => {
    const instructions = await userInstructionsService.getAll();
    reply.send(instructions);
  });

  // POST /api/instructions — thêm instruction mới (explicit, từ UI)
  app.post('/instructions', async (request, reply) => {
    const { instruction, category } = request.body as {
      instruction?: string;
      category?: string;
    };

    if (!instruction || instruction.trim().length === 0) {
      reply.status(400).send({ error: '"instruction" is required' });
      return;
    }

    const validCategories: InstructionCategory[] = ['tone', 'format', 'topic', 'general'];
    const cat: InstructionCategory = validCategories.includes(category as InstructionCategory)
      ? (category as InstructionCategory)
      : 'general';

    const created = await userInstructionsService.add(instruction.trim(), cat, 'explicit');
    reply.status(201).send(created);
  });

  // PATCH /api/instructions/:id/toggle — bật/tắt một instruction
  app.patch('/instructions/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { active } = request.body as { active?: boolean };

    if (typeof active !== 'boolean') {
      reply.status(400).send({ error: '"active" (boolean) is required' });
      return;
    }

    const updated = await userInstructionsService.toggle(id, active);
    if (!updated) {
      reply.status(404).send({ error: 'Instruction not found' });
      return;
    }
    reply.send(updated);
  });

  // DELETE /api/instructions/:id — xóa instruction
  app.delete('/instructions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await userInstructionsService.delete(id);
    reply.status(204).send();
  });

  // ─── Tool Preferences ─────────────────────────────────────────────────────

  // GET /api/instructions/tools — lấy trạng thái tất cả tools
  app.get('/instructions/tools', async (_request, reply) => {
    const prefs = await userInstructionsService.getToolPreferences();
    reply.send(prefs);
  });

  // PATCH /api/instructions/tools/:toolName — bật/tắt một tool
  app.patch('/instructions/tools/:toolName', async (request, reply) => {
    const { toolName } = request.params as { toolName: string };
    const { enabled } = request.body as { enabled?: boolean };

    const allowedTools = ['web_search', 'fetch_url', 'ingest_document'];
    if (!allowedTools.includes(toolName)) {
      reply.status(400).send({ error: `Unknown tool: ${toolName}` });
      return;
    }

    if (typeof enabled !== 'boolean') {
      reply.status(400).send({ error: '"enabled" (boolean) is required' });
      return;
    }

    await userInstructionsService.setToolEnabled(toolName, enabled);
    reply.send({ tool_name: toolName, enabled });
  });
}

import { conceptualRepository, ConceptualMemory, ConceptualCategory } from '../../db/repositories/ConceptualRepository';

export interface UserProfile {
  goals: ConceptualMemory[];
  beliefs: ConceptualMemory[];
  skills: ConceptualMemory[];
  preferences: ConceptualMemory[];
  plans: ConceptualMemory[];
  personality: ConceptualMemory[];
  values: ConceptualMemory[];
  habits: ConceptualMemory[];
}

export class ConceptualMemoryService {
  async update(
    category: ConceptualCategory,
    key: string,
    value: string,
    confidence: number,
    evidence: string[]
  ): Promise<ConceptualMemory> {
    return conceptualRepository.upsert(category, key, value, confidence, evidence);
  }

  async getFullProfile(): Promise<UserProfile> {
    const all = await conceptualRepository.getAll();

    const profile: UserProfile = {
      goals: [],
      beliefs: [],
      skills: [],
      preferences: [],
      plans: [],
      personality: [],
      values: [],
      habits: [],
    };

    for (const item of all) {
      switch (item.category) {
        case 'goal': profile.goals.push(item); break;
        case 'belief': profile.beliefs.push(item); break;
        case 'skill': profile.skills.push(item); break;
        case 'preference': profile.preferences.push(item); break;
        case 'plan': profile.plans.push(item); break;
        case 'personality': profile.personality.push(item); break;
        case 'value': profile.values.push(item); break;
        case 'habit': profile.habits.push(item); break;
      }
    }

    return profile;
  }

  async getHighConfidenceTraits(): Promise<ConceptualMemory[]> {
    return conceptualRepository.getHighConfidence(0.75);
  }

  async formatForSystemPrompt(): Promise<string> {
    const traits = await this.getHighConfidenceTraits();
    if (traits.length === 0) return '';

    const grouped: Partial<Record<ConceptualCategory, string[]>> = {};
    for (const t of traits) {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category]!.push(`• ${t.key}: ${t.value}`);
    }

    const sections: string[] = [];
    const categoryLabels: Record<string, string> = {
      goal: 'Goals & Objectives',
      belief: 'Core Beliefs',
      skill: 'Skills & Expertise',
      preference: 'Preferences',
      plan: 'Plans & Intentions',
      personality: 'Personality Traits',
      value: 'Values',
      habit: 'Habits & Routines',
    };

    for (const [cat, items] of Object.entries(grouped)) {
      if (items && items.length > 0) {
        sections.push(`${categoryLabels[cat] || cat}:\n${items.join('\n')}`);
      }
    }

    return sections.join('\n\n');
  }

  async countTraits(): Promise<number> {
    return conceptualRepository.count();
  }
}

export const conceptualMemoryService = new ConceptualMemoryService();

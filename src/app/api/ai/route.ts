import { NextRequest, NextResponse } from 'next/server';
import { AIRequestSchema } from '@/lib/validation/mealAnalysis';
import { AnthropicProvider } from '@/lib/ai/providers/AnthropicProvider';
import { AIService } from '@/lib/ai/service';

// AIService is stateless — create once per module load (one instance per cold start).
function getService(): AIService {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new AIService(new AnthropicProvider(apiKey));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AIRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const service = getService();
    const result  = await service.handleRequest(parsed.data);
    return NextResponse.json({ ok: true, capability: parsed.data.capability, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, model, system, messages } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: system || '',
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { error: `Anthropic API error: ${response.status} - ${errText}` },
          { status: response.status },
        );
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      return NextResponse.json({ content });
    }

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          max_tokens: 4096,
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { error: `OpenAI API error: ${response.status} - ${errText}` },
          { status: response.status },
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return NextResponse.json({ content });
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: `Server error: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}

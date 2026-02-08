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
        let errorDetail = errText;
        try {
          const errJson = JSON.parse(errText);
          errorDetail = errJson.error?.message || errJson.error || errText;
        } catch { /* use raw text */ }
        return NextResponse.json(
          { error: `Anthropic API error (${response.status}): ${errorDetail}` },
          { status: response.status },
        );
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      if (!content) {
        return NextResponse.json(
          { error: 'Anthropic returned an empty response. Check your API key and model.' },
          { status: 502 },
        );
      }
      return NextResponse.json({ content });
    }

    if (provider === 'openai') {
      const modelName = model || 'gpt-4o';

      // Reasoning models (o1, o3, o4) require max_completion_tokens
      // Standard models (gpt-4o, gpt-4-turbo, gpt-3.5) use max_tokens
      const isReasoningModel = /^(o1|o3|o4)/.test(modelName);
      const tokenParam = isReasoningModel
        ? { max_completion_tokens: 4096 }
        : { max_tokens: 4096 };

      // Reasoning models don't support system messages - convert to user context
      let apiMessages;
      if (isReasoningModel) {
        const systemMsg = messages.find((m: any) => m.role === 'system');
        const nonSystemMsgs = messages.filter((m: any) => m.role !== 'system');
        apiMessages = nonSystemMsgs.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
        // Prepend system content as user context for reasoning models
        if (systemMsg && apiMessages.length > 0 && apiMessages[0].role === 'user') {
          apiMessages[0].content = `[Context: ${systemMsg.content}]\n\n${apiMessages[0].content}`;
        }
      } else {
        apiMessages = messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          ...tokenParam,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errorDetail = errText;
        try {
          const errJson = JSON.parse(errText);
          errorDetail = errJson.error?.message || errJson.error || errText;
        } catch { /* use raw text */ }

        // If we get a max_tokens error, retry with the other parameter
        if (response.status === 400 && typeof errorDetail === 'string' &&
            (errorDetail.includes('max_tokens') || errorDetail.includes('max_completion_tokens'))) {
          const retryParam = isReasoningModel
            ? { max_tokens: 4096 }
            : { max_completion_tokens: 4096 };

          const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              ...retryParam,
              messages: apiMessages,
            }),
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            const retryContent = retryData.choices?.[0]?.message?.content || '';
            return NextResponse.json({ content: retryContent });
          }
        }

        return NextResponse.json(
          { error: `OpenAI API error (${response.status}): ${errorDetail}` },
          { status: response.status },
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (!content) {
        return NextResponse.json(
          { error: 'OpenAI returned an empty response. Check your API key and model.' },
          { status: 502 },
        );
      }
      return NextResponse.json({ content });
    }

    return NextResponse.json({ error: 'Unknown provider. Use "anthropic" or "openai".' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Server error: ${msg}` },
      { status: 500 },
    );
  }
}

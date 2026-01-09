
import { Injectable, signal } from '@angular/core';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ChatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  tools: Tool[];
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  async *streamMessage(config: ChatConfig, messages: ChatMessage[]): AsyncGenerator<CompletionResponse> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const baseUrl = config.baseUrl.replace(/\/$/, '');
      const url = `${baseUrl}/chat/completions`;

      const cleanMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const temperature = Number(config.temperature);
      const maxTokens = Number(config.maxTokens);
      const topP = Number(config.topP);

      const body: any = {
        model: config.model,
        messages: cleanMessages,
        temperature: isNaN(temperature) ? 0.7 : temperature,
        max_tokens: isNaN(maxTokens) ? 1024 : maxTokens,
        top_p: isNaN(topP) ? 1.0 : topP,
        stream: true
      };

      if (config.tools && config.tools.length > 0) {
        body.tools = config.tools;
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(body)
        });
      } catch (netErr: any) {
        if (netErr.name === 'TypeError' && (netErr.message === 'Failed to fetch' || netErr.message.includes('NetworkError'))) {
             throw new Error('Bağlantı Xətası: API serverinə qoşulmaq mümkün olmadı. Base URL-i, interneti və ya CORS siyasətini yoxlayın.');
        }
        throw netErr;
      }

      if (!response.ok) {
        if (response.status === 429) {
             throw new Error("Matris yükləndi: Həddindən çox sorğu (Rate Limit). Zəhmət olmasa gözləyin...");
        }
        
        const textBody = await response.text();
        let errorMessage = `API Xətası: ${response.status} ${response.statusText}`;
        try {
            const errorData = JSON.parse(textBody);
            // Handle various proxy error formats
            if (errorData?.error?.message) {
                errorMessage = errorData.error.message;
            } else if (errorData?.error?.code) {
                errorMessage = `Error Code: ${errorData.error.code}`;
            } else if (typeof errorData?.error === 'string') {
                errorMessage = errorData.error;
            } else if (errorData?.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            // If parsing fails, use the text body if short enough, otherwise default status
            if (textBody.length < 200) errorMessage = textBody;
        }
        
        throw new Error(errorMessage);
      }

      if (!response.body) throw new Error('Boş cavab gövdəsi (Empty Body)');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let accumulatedContent = '';
      let responseId = '';
      let responseModel = '';
      let responseCreated = Date.now();
      let usage: CompletionResponse['usage'] | undefined;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; 

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            if (!responseId && data.id) {
                responseId = data.id;
                responseModel = data.model;
                responseCreated = data.created;
            }

            const choice = data.choices?.[0];
            const deltaContent = choice?.delta?.content || '';
            accumulatedContent += deltaContent;

            if (data.usage) usage = data.usage;

            yield {
              id: responseId || 'streaming',
              object: 'chat.completion',
              created: responseCreated,
              model: responseModel || config.model,
              choices: [{
                index: 0,
                message: { role: 'assistant', content: accumulatedContent },
                finish_reason: choice?.finish_reason || ''
              }],
              usage: usage
            };
          } catch (e) {}
        }
      }
    } catch (err: any) {
      console.error('LlmService Error:', err);
      // Clean up error message if it's an object object
      let msg = err.message || 'Naməlum xəta baş verdi';
      if (msg === '[object Object]') msg = 'API returned an unstructured error object.';
      this.error.set(msg);
      throw new Error(msg);
    } finally {
      this.loading.set(false);
    }
  }
}

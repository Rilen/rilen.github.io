import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { normalize, matchKnowledge } from "../knowledge/matcher.js";
import knowledge from "../knowledge/nelir.pt-BR.json";
import worker from "../index.js";

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = vi.fn(() => {
    throw new Error("Gemini deve ser chamado nos testes de base local");
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

async function post(question, env = {}) {
  return worker.fetch(new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  }), env);
}

async function body(res) {
  return await res.json();
}

describe("matcher", () => {
  it("normaliza removendo acentos, pontuacao e espacos duplicados", () => {
    expect(normalize("Quem  é você?!")).toBe("quem e voce");
    expect(normalize("Arquitetura Medallion")).toBe("arquitetura medallion");
  });

  it("corresponde a pergunta conhecida por substring", () => {
    const match = matchKnowledge("Quem é você?", knowledge);
    expect(match).not.toBeNull();
    expect(match.entry.id).toBe("nelir-quem-e");
    expect(typeof match.entry.reply).toBe("string");
    expect(match.entry.reply.length).toBeGreaterThan(0);
  });

  it("corresponde variante sem acento", () => {
    const match = matchKnowledge("quem eh nelir", knowledge);
    expect(match).not.toBeNull();
    expect(match.entry.id).toBe("nelir-quem-e");
  });

  it("nao corresponde a pergunta fora da base", () => {
    expect(matchKnowledge("qual a receita de bolo de chocolate", knowledge)).toBeNull();
  });

  it("vence o pattern mais especifico (mais longo)", () => {
    const curto = matchKnowledge("quem e rilen", knowledge);
    const longo = matchKnowledge("qual o perfil do rilen", knowledge);
    expect(curto).not.toBeNull();
    expect(longo).not.toBeNull();
    expect(longo.entry.id).toBe("rilen-perfil");
  });
});

describe("worker - base local (zero chamadas ao Gemini)", () => {
  it("pergunta conhecida retorna reply local sem chamar o Gemini e sem credenciais", async () => {
    const res = await post("Quem é você?");
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toBeTruthy();
    expect(typeof data.reply).toBe("string");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("variante sem acento retorna reply local sem chamar o Gemini", async () => {
    const res = await post("quem eh nelir");
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toContain("Nelir");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("pergunta sobre contato retorna reply local sem credenciais", async () => {
    const res = await post("qual o email do rilen?");
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toContain("rilen.lima@gmail.com");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("worker - fora da base", () => {
  it("pergunta nao pertinente informa limitacao sem chamar o Gemini", async () => {
    const res = await post("qual a receita de bolo de chocolate?");
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toContain("Não tenho informações verificadas");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("pergunta pertinente fora da base sem credenciais retorna mensagem amigável sem chamar o Gemini", async () => {
    const res = await post("qual a experiencia do rilen com kubernetes?");
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toContain("Não consigo consultar a IA");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("pergunta vazia retorna erro 400", async () => {
    const res = await post("");
    expect(res.status).toBe(400);
  });
});

describe("matcher - palavra inteira / expressao", () => {
  it("ia nao corresponde dentro de melancia (somente palavra inteira)", () => {
    expect(matchKnowledge("melancia", knowledge)).toBeNull();
  });

  it("nao captura mençao generica de tecnologia em pergunta especifica que a entrada nao responde", () => {
    expect(matchKnowledge("qual o preco do spark", knowledge)).toBeNull();
    expect(matchKnowledge("databricks certification", knowledge)).toBeNull();
    expect(matchKnowledge("polars vs pandas", knowledge)).toBeNull();
  });

  it("expressao multi-palavras ainda corresponde como token contiguo", () => {
    const match = matchKnowledge("engenharia de dados", knowledge);
    expect(match).not.toBeNull();
    expect(match.entry.id).toBe("rilen-hard-skills");
  });
});

describe("worker - Gemini simulado (mocked fetch)", () => {
  function mockGemini(response) {
    global.fetch = vi.fn().mockResolvedValue(response);
  }

  it("sucesso: retorna resposta do Gemini e chama fetch uma vez", async () => {
    mockGemini({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [{ content: { parts: [{ text: "resposta do gemini" }] } }],
        }),
    });

    const res = await post("qual a experiencia do rilen com kubernetes?", {
      GEMINI_API_KEY: "fake-key",
    });
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toBe("resposta do gemini");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("erro do provedor: retorna mensagem amigavel sem expor detalhe interno", async () => {
    mockGemini({
      ok: false,
      json: () => Promise.resolve({ error: { message: "chave invalida" } }),
    });

    const res = await post("qual a experiencia do rilen com kubernetes?", {
      GEMINI_API_KEY: "fake-key",
    });
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toContain("Não consegui acessar a Nelir");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("resposta invalida (sem candidatos): retorna mensagem amigavel", async () => {
    mockGemini({ ok: true, json: () => Promise.resolve({}) });

    const res = await post("qual a experiencia do rilen com kubernetes?", {
      GEMINI_API_KEY: "fake-key",
    });
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toContain("Não consegui acessar a Nelir");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("worker - validacao de entrada", () => {
  it("question numero (123) retorna 400, mensagem estavel e zero chamadas ao Gemini", async () => {
    const res = await post(123);
    expect(res.status).toBe(400);
    const data = await body(res);
    expect(data.error).toBe("Pergunta invalida ou vazia");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("question com 601 caracteres retorna 400, mensagem estavel e zero chamadas ao Gemini", async () => {
    const res = await post("a".repeat(601));
    expect(res.status).toBe(400);
    const data = await body(res);
    expect(data.error).toBe("Pergunta invalida ou vazia");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("question com exatamente 600 caracteres passa na validacao", async () => {
    const res = await post("a".repeat(600));
    expect(res.status).not.toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("question apenas espacos retorna 400 e zero chamadas ao Gemini", async () => {
    const res = await post("   ");
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("worker - pertinence de palavra inteira", () => {
  it("melancia nao e pertinente (ia nao captura dentro da palavra)", async () => {
    const res = await post("melancia");
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toContain("Não tenho informações verificadas");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("ia como palavra inteira e pertinente", async () => {
    const res = await post("ia");
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.reply).toContain("Não consigo consultar a IA");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

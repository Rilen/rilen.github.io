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

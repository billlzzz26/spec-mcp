import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Page from "../app/page";

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

global.fetch = vi.fn();

describe("SkillServiceWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  it("renders the widget header", () => {
    render(<Page />);

    expect(screen.getByText("Skill Service")).toBeInTheDocument();
    expect(
      screen.getByText(/semantic search for ai agent skills/i),
    ).toBeInTheDocument();
  });

  it("renders search form", () => {
    render(<Page />);

    expect(screen.getAllByText("Search Skills")).toHaveLength(2);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /search skills/i }),
    ).toBeInTheDocument();
  });

  it("shows loading state when searching", async () => {
    vi.mocked(global.fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response),
    );

    render(<Page />);

    const input = screen.getByTestId("search-input");
    const button = screen.getByRole("button", { name: /search skills/i });

    await userEvent.type(input, "test query");
    await userEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("displays search results", async () => {
    const mockSkills = [
      {
        skill_id: "test-skill",
        skill_name: "Test Skill",
        description: "A test skill description",
        capabilities: ["test", "demo"],
        plugin_domain: "testing",
        rerank_score: 0.95,
      },
    ];

    vi.mocked(global.fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSkills),
      } as Response),
    );

    render(<Page />);

    const input = screen.getByTestId("search-input");
    const button = screen.getByRole("button", { name: /search skills/i });

    await userEvent.type(input, "test");
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });

    expect(screen.getByText("A test skill description")).toBeInTheDocument();
    expect(screen.getByText(/95% match/i)).toBeInTheDocument();
  });

  it("shows error message when search fails", async () => {
    vi.mocked(global.fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response),
    );

    render(<Page />);

    const input = screen.getByTestId("search-input");
    const button = screen.getByRole("button", { name: /search skills/i });

    await userEvent.type(input, "test");
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/search failed/i)).toBeInTheDocument();
    });
  });

  it("shows empty state when no search performed", () => {
    render(<Page />);

    expect(screen.getByText("Ready to search")).toBeInTheDocument();
  });
});

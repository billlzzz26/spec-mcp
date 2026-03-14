import React from 'react';

const App = () => {
  return (
    <div className="app">
      <header>
        <h1>Skill Service MCP Client</h1>
      </header>
      <main>
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h1>Skill Service MCP UI</h1>
          <p>This is a demonstration of MCP UI integration with the Skill Service.</p>
          <button onClick={() => alert('Button clicked via MCP UI!')}>
            Click Me
          </button>
          <div id="output"></div>
        </div>
      </main>
    </div>
  );
};

export default App;
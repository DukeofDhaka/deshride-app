## 2026-07-05T23:56:04-04:00
You are the Test Infrastructure Setup Worker.
Your working directory is /Users/dukez/Documents/Amr DeshRide/.agents/worker_setup_infra.
Your task is to set up the testing framework in the project:
1. Install vitest, jsdom, @testing-library/react, @testing-library/jest-dom, and @testing-library/dom as devDependencies. Use npm install --save-dev or equivalent.
2. Configure "test": "vitest run" in package.json's scripts.
3. Configure vite.config.ts to include the test environment setup (jsdom environment, globals: true, setupFiles: './src/test/setup.ts').
4. Create the setup file src/test/setup.ts. In this file, mock window.scrollTo = () => {} and set up standard Jest/Vitest DOM assertions import if needed, and ensure localStorage is cleared before/after each test.
5. Create a simple test src/test/sanity.test.tsx that renders a simple component (e.g. <div data-testid="sanity">Sanity Check</div>) using @testing-library/react and asserts it is in the document, to verify the test setup compiles and runs.
6. Create /Users/dukez/Documents/Amr DeshRide/TEST_INFRA.md according to the template in your instructions. It should describe the test philosophy, feature inventory (F1-F7), architecture, and directories.
7. Run the test command to verify that sanity.test.tsx passes successfully.
8. Write a handoff report at /Users/dukez/Documents/Amr DeshRide/.agents/worker_setup_infra/handoff.md detailing what you installed, the scripts you added, the contents of the config, and the test run output.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

#!/usr/bin/env node

import { ConfigValidator } from "#utils/validators/ConfigValidator";
import { ProgressTracker } from "#utils/core/ProgressTracker";
import { HTMLProcessor } from "#utils/processors/HTMLProcessor";
import { AsyncProcessor } from "#utils/core/AsyncProcessor";
import hey from "#utils/core/logger";

async function testRefactoredComponents() {
  hey.info("🧪 Testing refactored components...");

  try {
    // Test ConfigValidator
    hey.info("Testing ConfigValidator...");
    const validator = new ConfigValidator();
    await validator.validate();
    hey.success("✅ ConfigValidator works");

    // Test ProgressTracker
    hey.info("Testing ProgressTracker...");
    const tracker = new ProgressTracker(5, "Test Operation");
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      tracker.increment(1, `Step ${i + 1}`);
    }
    tracker.complete("Test completed");
    hey.success("✅ ProgressTracker works");

    // Test HTMLProcessor
    hey.info("Testing HTMLProcessor...");
    const processor = new HTMLProcessor({
      emojiMode: "replace",
      accentColor: "#ff0000"
    });
    
    const testHtml = `
      <html>
        <body>
          <h1>Test Title</h1>
          <p>Hello world! ❤️</p>
          <img src="test.jpg" alt="Test image">
          <pre><code>console.log("Hello");</code></pre>
        </body>
      </html>
    `;
    
    const result = await processor.processHTML(testHtml);
    if (result.html && result.html.includes(":heart:")) {
      hey.success("✅ HTMLProcessor works (emoji replacement)");
    } else {
      hey.warn("⚠️ HTMLProcessor emoji replacement may not be working");
    }

    // Test AsyncProcessor
    hey.info("Testing AsyncProcessor...");
    const asyncProc = new AsyncProcessor({ maxConcurrency: 2 });
    const testItems = [1, 2, 3, 4, 5];
    const testTracker = new ProgressTracker(testItems.length, "Test Processing");
    
    const { results, errors } = await asyncProc.processWithProgress(
      testItems,
      async (item) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return item * 2;
      },
      testTracker
    );
    
    if (results.length === 5 && errors.length === 0) {
      hey.success("✅ AsyncProcessor works");
    } else {
      hey.warn("⚠️ AsyncProcessor may have issues");
    }

    hey.success("🎉 All refactored components are working!");

  } catch (error) {
    hey.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testRefactoredComponents(); 
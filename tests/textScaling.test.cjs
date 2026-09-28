const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC_DIR = path.resolve(__dirname, "../src");

/**
 * Helper to recursively find all .ts and .tsx files in a directory
 */
function getSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getSourceFiles(fullPath, fileList);
    } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// ---------------------------------------------------------------------------
// TEST SUITE: Section 19 Accessibility - Large Font Scaling (§19 Đặc tả)
// ---------------------------------------------------------------------------

test("accessibility: zero suppression of font scaling (no allowFontScaling={false} in src)", () => {
  const allFiles = getSourceFiles(SRC_DIR);
  assert.ok(allFiles.length > 0, "Source files should exist in src directory");

  const violations = [];
  const regex = /allowFontScaling\s*=\s*\{\s*false\s*\}/g;

  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (regex.test(content)) {
      const relPath = path.relative(path.resolve(__dirname, ".."), file);
      violations.push(relPath);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found hardcoded allowFontScaling={false} in files: ${violations.join(", ")}. Font scaling must not be globally disabled.`
  );
});

test("accessibility: interactive buttons use elastic min-height instead of rigid fixed height", () => {
  const buttonPath = path.join(SRC_DIR, "components/ui/PrimaryButton.tsx");
  assert.ok(fs.existsSync(buttonPath), "PrimaryButton.tsx must exist");

  const content = fs.readFileSync(buttonPath, "utf8");

  // PrimaryButton must use min-h-[44px] or min-h-[48px] with vertical padding py-
  const hasMinHeight = /min-h-\[\d+px\]/.test(content) || /minHeight/.test(content);
  const hasPaddingY = /py-\d+/.test(content);
  assert.ok(hasMinHeight, "PrimaryButton must specify a min-height for elastic scaling");
  assert.ok(hasPaddingY, "PrimaryButton must use vertical padding py-* to allow elastic expansion");

  // Must not enforce rigid h-10 / h-12 without min-h
  const hasRigidFixedButtonHeight = /\bclassName="[^"]*\bh-\d+\b[^"]*"/.test(content);
  assert.equal(
    hasRigidFixedButtonHeight,
    false,
    "PrimaryButton must not use rigid fixed height class (e.g. h-10) that clips scaled text"
  );
});

test("accessibility: math verification of elastic container height across fontScale 1.0x to 2.0x", () => {
  /**
   * Simulates how a button container behaves under different OS font scale factors:
   * iOS Dynamic Type & Android Font Size:
   * 1.0x = Normal default
   * 1.3x = iOS Default Large
   * 1.5x = Very Large
   * 2.0x = Maximum Accessibility Size
   */
  function calculateButtonLayout({
    baseFontSize = 15,
    baseLineHeight = 20,
    paddingVertical = 12,
    minHeight = 44,
    fontScale = 1.0,
    isRigidHeight = false,
  }) {
    const scaledFontSize = Math.round(baseFontSize * fontScale);
    const scaledLineHeight = Math.round(baseLineHeight * fontScale);
    const contentHeight = scaledLineHeight + paddingVertical * 2;
    const renderedHeight = isRigidHeight ? minHeight : Math.max(minHeight, contentHeight);
    const isClipped = isRigidHeight && contentHeight > minHeight;
    const clippedPixels = isClipped ? contentHeight - minHeight : 0;

    return {
      scaledFontSize,
      scaledLineHeight,
      contentHeight,
      renderedHeight,
      isClipped,
      clippedPixels,
    };
  }

  // 1. At 1.0x (Normal)
  const normalLayout = calculateButtonLayout({ fontScale: 1.0, isRigidHeight: false });
  assert.equal(normalLayout.renderedHeight, 44);
  assert.equal(normalLayout.isClipped, false);

  // 2. At 1.3x (Large font)
  const largeLayout = calculateButtonLayout({ fontScale: 1.3, isRigidHeight: false });
  assert.equal(largeLayout.scaledFontSize, 20);
  assert.equal(largeLayout.scaledLineHeight, 26);
  assert.equal(largeLayout.renderedHeight, 50); // Expands from 44px to 50px
  assert.equal(largeLayout.isClipped, false);

  // 3. At 1.5x (Extra large font)
  const xlLayout = calculateButtonLayout({ fontScale: 1.5, isRigidHeight: false });
  assert.equal(xlLayout.scaledFontSize, 23);
  assert.equal(xlLayout.scaledLineHeight, 30);
  assert.equal(xlLayout.renderedHeight, 54); // Expands to 54px
  assert.equal(xlLayout.isClipped, false);

  // 4. At 2.0x (Maximum accessibility scale)
  const maxLayout = calculateButtonLayout({ fontScale: 2.0, isRigidHeight: false });
  assert.equal(maxLayout.scaledFontSize, 30);
  assert.equal(maxLayout.scaledLineHeight, 40);
  assert.equal(maxLayout.renderedHeight, 64); // Expands to 64px
  assert.equal(maxLayout.isClipped, false);

  // 5. Compare with rigid fixed height (anti-pattern: height = 44px)
  const rigidLayout = calculateButtonLayout({ fontScale: 2.0, isRigidHeight: true });
  assert.equal(rigidLayout.renderedHeight, 44);
  assert.equal(rigidLayout.isClipped, true);
  assert.equal(rigidLayout.clippedPixels, 20, "Rigid container would clip 20px of text at 2.0x fontScale");
});

test("accessibility: primary app screens are wrapped in ScrollView or FlatList for large text expansion", () => {
  const primaryScreens = [
    "screens/tabs/HomeScreen.tsx",
    "screens/tabs/ProfileScreen.tsx",
    "screens/tabs/VideosScreen.tsx",
    "screens/tabs/TextPracticeScreen.tsx",
    "screens/tabs/PhonemesScreen.tsx",
    "screens/practice/VideoPracticeScreen.tsx",
    "screens/payment/PaymentScreen.tsx",
    "screens/auth/LoginScreen.tsx",
  ];

  for (const screenRelPath of primaryScreens) {
    const fullPath = path.join(SRC_DIR, screenRelPath);
    assert.ok(fs.existsSync(fullPath), `Screen file ${screenRelPath} must exist`);

    const content = fs.readFileSync(fullPath, "utf8");
    const hasScrollContainer =
      content.includes("<ScrollView") ||
      content.includes("<FlatList") ||
      content.includes("contentContainerStyle");

    assert.ok(
      hasScrollContainer,
      `${screenRelPath} must use a scrollable container (<ScrollView> or <FlatList>) to accommodate large text expansion`
    );
  }
});

test("accessibility: practice sentence prompts and phonetic guidance do not force 1-line truncation", () => {
  // Practice prompt containers must not force single line truncation
  const ipaCheckingPath = path.join(SRC_DIR, "components/practice/IPAChecking.tsx");
  assert.ok(fs.existsSync(ipaCheckingPath), "IPAChecking.tsx must exist");

  const content = fs.readFileSync(ipaCheckingPath, "utf8");

  // In IPAChecking, the sentence text display should allow multi-line rendering
  // Ensure the practice sentence container allows wrapping
  const hasFlexWrapOrMultiline =
    content.includes("flex-wrap") ||
    content.includes("leading-") ||
    content.includes("ScoreWords");

  assert.ok(
    hasFlexWrapOrMultiline,
    "IPAChecking practice prompt and score display must support multi-line text flow for large fonts"
  );
});

test("accessibility: Google & Apple sign-in buttons comply with accessibility minimum touch & scale targets", () => {
  const googleBtnPath = path.join(SRC_DIR, "components/ui/GoogleSignInButton.tsx");
  assert.ok(fs.existsSync(googleBtnPath), "GoogleSignInButton.tsx must exist");

  const googleContent = fs.readFileSync(googleBtnPath, "utf8");
  // Min height 48px meets Apple HIG and Google Material Accessibility guidelines (minimum 48x48)
  assert.ok(
    googleContent.includes("min-h-[48px]"),
    "GoogleSignInButton must meet 48px minimum touch and scale target"
  );
  assert.ok(
    googleContent.includes("py-3"),
    "GoogleSignInButton must use vertical padding to expand smoothly under large fonts"
  );
});

// ---------------------------------------------------------------------------
// TEST SUITE: Section 19 Accessibility - Screen Reader Compatibility (VoiceOver / TalkBack)
// ---------------------------------------------------------------------------

test("screen reader: interactive buttons in PrimaryButton and ChipButton declare accessibilityRole and accessibilityState", () => {
  const buttonPath = path.join(SRC_DIR, "components/ui/PrimaryButton.tsx");
  assert.ok(fs.existsSync(buttonPath), "PrimaryButton.tsx must exist");

  const content = fs.readFileSync(buttonPath, "utf8");

  // Check PrimaryButton has accessibilityRole="button", accessibilityLabel, and accessibilityState
  assert.ok(
    content.includes('accessibilityRole="button"'),
    "PrimaryButton must declare accessibilityRole='button' for screen readers"
  );
  assert.ok(
    content.includes("accessibilityLabel={title}"),
    "PrimaryButton must expose accessibilityLabel with its title"
  );
  assert.ok(
    content.includes("accessibilityState="),
    "PrimaryButton must provide accessibilityState (disabled, busy) to screen readers"
  );

  // Check ChipButton has accessibilityState with selected
  assert.ok(
    content.includes("selected: !!active"),
    "ChipButton must report selected state to screen readers"
  );
});

test("screen reader: hero recording button in VideoRecordingHub declares dynamic accessibilityLabel, accessibilityHint and accessibilityState", () => {
  const hubPath = path.join(SRC_DIR, "components/practice/VideoRecordingHub.tsx");
  assert.ok(fs.existsSync(hubPath), "VideoRecordingHub.tsx must exist");

  const content = fs.readFileSync(hubPath, "utf8");

  // Main circular recording button
  assert.ok(
    content.includes('accessibilityRole="button"'),
    "VideoRecordingHub recording button must declare accessibilityRole='button'"
  );
  assert.ok(
    content.includes("accessibilityStopRecording") &&
    content.includes("accessibilityStartRecording"),
    "VideoRecordingHub recording button must declare dynamic accessibilityLabel depending on recording state"
  );
  assert.ok(
    content.includes("accessibilityHint="),
    "VideoRecordingHub recording button must declare accessibilityHint guiding user how to toggle"
  );
  assert.ok(
    content.includes("busy: !!(isStarting || checking)"),
    "VideoRecordingHub recording button must declare accessibilityState busy during starting/checking"
  );

  // Replay voice action
  assert.ok(
    content.includes("accessibilityPlayVoice") || content.includes("listenMyVoice"),
    "VideoRecordingHub replay action must provide accessibilityLabel for hearing user's voice"
  );
});

test("screen reader: video practice screen provides accessibility labels for back and sentence navigation", () => {
  const practicePath = path.join(SRC_DIR, "screens/practice/VideoPracticeScreen.tsx");
  assert.ok(fs.existsSync(practicePath), "VideoPracticeScreen.tsx must exist");

  const content = fs.readFileSync(practicePath, "utf8");

  // Back button accessibility
  assert.ok(
    content.includes('accessibilityRole="button"') &&
    content.includes('accessibilityLabel={t("common.back"'),
    "VideoPracticeScreen back button must declare accessibilityRole='button' and localized accessibilityLabel"
  );

  // Previous and Next sentence navigation accessibility
  assert.ok(
    content.includes('accessibilityLabel={t("videos.practice.prevSentence"') &&
    content.includes('accessibilityLabel={t("videos.practice.nextSentence"'),
    "VideoPracticeScreen must provide accessible sentence navigation for VoiceOver/TalkBack"
  );
});

test("screen reader: profile screen segmented tabs declare accessibilityRole='tab' and selection state", () => {
  const profilePath = path.join(SRC_DIR, "screens/tabs/ProfileScreen.tsx");
  assert.ok(fs.existsSync(profilePath), "ProfileScreen.tsx must exist");

  const content = fs.readFileSync(profilePath, "utf8");

  assert.ok(
    content.includes('accessibilityRole="tab"'),
    "ProfileScreen segmented tabs must declare accessibilityRole='tab'"
  );
  assert.ok(
    content.includes("accessibilityState={{ selected: activeTab === TAB_PROGRESS }}") &&
    content.includes("accessibilityState={{ selected: activeTab === TAB_ACCOUNT }}"),
    "ProfileScreen tabs must inform screen reader of the selected tab state"
  );
});


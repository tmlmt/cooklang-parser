import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { execa } from "execa";

// --- Configuration ---
const CHANGELOG_PATH = path.resolve(process.cwd(), "CHANGELOG.md");
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_BUILDTEST = process.argv.includes("--skip-buildtest");

// Parse release version from --release or -r argument
function getReleaseVersion() {
  const args = process.argv;
  const releaseIndex = args.findIndex(
    (arg) => arg === "--release" || arg === "-r",
  );
  if (releaseIndex !== -1 && args[releaseIndex + 1]) {
    return args[releaseIndex + 1];
  }
  return null;
}
const RELEASE_VERSION = getReleaseVersion();

// --- Helper Functions ---
const log = {
  info: (msg) => console.log(`\x1b[34mINFO\x1b[0m: ${msg}`),
  prompt: (msg) => `\x1b[33mPROMPT\x1b[0m: ${msg}`,
  error: (msg) => console.error(`\x1b[31mERROR\x1b[0m: ${msg}`),
  success: (msg) => console.log(`\x1b[32mSUCCESS\x1b[0m: ${msg}`),
};

async function run(command, args, options = {}) {
  if (DRY_RUN) {
    let commandToLog = `${command} ${args.join(" ")}`;
    let additionalLog;

    // Special handling for the 'gh release create' command to avoid verbose logging.
    if (command === "gh" && args.includes("--notes")) {
      const loggedArgs = [...args];
      const notesIndex = loggedArgs.indexOf("--notes");
      if (notesIndex !== -1 && loggedArgs.length > notesIndex + 1) {
        loggedArgs[notesIndex + 1] = "<release notes>";
        commandToLog = `${command} ${loggedArgs.join(" ")}`;
        additionalLog = "       ...and with the release notes as notes.";
      }
    }

    log.info(`[dry-run] Would run: ${commandToLog}`);
    if (additionalLog) {
      log.info(additionalLog);
    }

    return { stdout: "", stderr: "" };
  }
  return await execa(command, args, { stdio: "inherit", ...options });
}

async function askForConfirmation(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(log.prompt(`${question} (Y/n) `));
  rl.close();
  return answer.toLowerCase().trim();
}

async function checkPrerequisites() {
  log.info("Checking prerequisites...");

  // Check for gh CLI installation
  try {
    await execa("gh", ["--version"], { stdio: "ignore" });
  } catch (error) {
    if (error.code === "ENOENT") {
      log.error(
        "GitHub CLI (gh) is not installed. Please install it and try again).",
      );
      process.exit(1);
    }
    log.error("An unexpected error occurred while checking for gh CLI:");
    console.error(error);
    process.exit(1);
  }

  // Check for gh auth status
  const authStatus = await execa("gh", ["auth", "status"], { reject: false });
  if (authStatus.failed) {
    log.error(
      'You are not logged into the GitHub CLI. Please run "gh auth login" and try again.',
    );
    process.exit(1);
  }

  log.success("Prerequisites met.");
}

async function buildTest() {
  log.info("Running tests and building documentation...");
  try {
    await run("pnpm", ["lint"]);
    await run("pnpm", ["test"]);
    await run("pnpm", ["docs:build"]);
  } catch (error) {
    log.error("Tests or documentation build failed.");
    console.error(error);
    process.exit(1);
  }

  log.success("Tests and documentation build completed successfully.");
}

// --- Main Script ---
async function main() {
  log.info("Starting release process...");
  if (DRY_RUN) {
    log.info("Running in dry-run mode. No commands will be executed.");
  }

  await checkPrerequisites();
  if (SKIP_BUILDTEST) {
    log.info("Skipping build tests.");
  } else {
    log.info("Starting build tests.");
    await buildTest();
  }

  // 1. Run changelogen to bump version and update changelog
  log.info("Bumping version and generating changelog with changelogen...");
  if (RELEASE_VERSION) {
    log.info(`Using manually specified version: ${RELEASE_VERSION}`);
  }

  // Build changelogen arguments
  const changelogPreviewArgs = ["changelogen@latest", "--no-output"];
  const changelogBumpArgs = ["changelogen@latest", "--bump"];
  if (RELEASE_VERSION) {
    changelogPreviewArgs.push("-r", RELEASE_VERSION);
    changelogBumpArgs.push("-r", RELEASE_VERSION);
  }

  if (DRY_RUN) {
    log.info("Previewing changelog generation...");
    // We use execa directly here to bypass the dry-run logic of our `run` helper
    // and show a preview of what changelogen will do.
    await execa("pnpx", changelogPreviewArgs, {
      stdio: "inherit",
    });
    const continueAnswer = await askForConfirmation(
      "Apply file changes and continue with dry-run?",
    );
    if (continueAnswer === "n" || continueAnswer === "N") {
      log.info("Dry-run aborted by user.");
      process.exit(0);
    }
    log.info("Applying changelog changes to proceed with dry-run...");
    await execa("pnpx", changelogBumpArgs, { stdio: "inherit" });
  } else {
    await run("pnpx", changelogBumpArgs);
  }

  // 2. Get version from the updated package.json
  const packageJsonPath = path.resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const { version } = pkg;
  if (!version) {
    log.error("Could not read version from package.json");
    process.exit(1);
  }
  const tag = `v${version}`;
  log.info(`Version to be released: ${version}`);

  // 3. Extract release notes from CHANGELOG.md
  log.info("Extracting release notes from CHANGELOG.md...");

  function extractReleaseNotes() {
    const changelog = fs.readFileSync(CHANGELOG_PATH, "utf-8");
    const lines = changelog.split("\n");

    const versionHeader = `## ${tag}`;
    const startIndex = lines.findIndex((line) =>
      line.startsWith(versionHeader),
    );

    if (startIndex === -1) {
      log.error(
        `Could not find release notes for version ${tag} in CHANGELOG.md.`,
      );
      process.exit(1);
    }

    // Find the end of the section for the current version
    let endIndex = lines.findIndex(
      (line, index) => index > startIndex && line.startsWith("## v"),
    );
    if (endIndex === -1) {
      endIndex = lines.length;
    }

    // Find the '[compare changes]' link to start the notes from there
    const sectionLines = lines.slice(startIndex, endIndex);
    const notesStartIndex = sectionLines.findIndex((line) =>
      line.startsWith("[compare changes]"),
    );

    if (notesStartIndex === -1) {
      log.error(
        `Could not find '[compare changes]' link for version ${tag} in CHANGELOG.md.`,
      );
      process.exit(1);
    }

    return sectionLines.slice(notesStartIndex).join("\n").trim();
  }

  let releaseNotes = extractReleaseNotes();

  if (!releaseNotes) {
    log.error("Extracted release notes are empty.");
    process.exit(1);
  }
  log.success("Successfully extracted release notes.");

  // 4. Show extracted notes for review
  log.info("--- Release Notes (for review) ---");
  const indentedNotes = releaseNotes
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  console.log(indentedNotes);
  log.info("----------------------------------");

  // 5. Ask to continue with commit and tag
  if (!DRY_RUN) {
    const answer = await askForConfirmation("Proceed with commit and tag?");
    if (answer === "n" || answer === "N") {
      log.info("Release aborted by user.");
      const revertAnswer = await askForConfirmation(
        "Revert changes to package.json and CHANGELOG.md?",
      );
      if (revertAnswer !== "n" && revertAnswer !== "N") {
        await run("git", ["checkout", "package.json", "CHANGELOG.md"]);
        log.success("Changes have been reverted.");
      }
      process.exit(0);
    }
  }

  // 6. Stage and commit the changes
  log.info("Staging package.json and CHANGELOG.md...");
  await run("git", ["add", "package.json", "CHANGELOG.md"]);
  const commitMessage = `chore(release): ${tag}`;
  log.info(`Committing with message: "${commitMessage}"`);
  await run("git", ["commit", "-m", commitMessage]);

  // 7. Create an annotated tag
  log.info(`Creating annotated tag: ${tag}`);
  await run("git", ["tag", "-a", tag, "-m", tag]);

  log.success("Local commit and tag created successfully!");

  // 8. Ask to push
  if (!DRY_RUN) {
    const answer = await askForConfirmation("Push commit and tags to remote?");
    if (answer === "n" || answer === "N") {
      log.info("Push aborted by user.");
      const revertAnswer = await askForConfirmation(
        "Revert local commit and tag?",
      );
      if (revertAnswer !== "n" && revertAnswer !== "N") {
        log.info("Reverting local commit and tag...");
        await run("git", ["reset", "--soft", "HEAD~1"]);
        await run("git", ["tag", "-d", tag]);
        log.success("Local changes have been reverted.");
        log.info("Your staged files are preserved.");
      } else {
        log.info(
          'Local commit and tag were not reverted. Run "git push && git push --tags" manually to publish.',
        );
      }
      process.exit(0);
    }
  }

  // 9. Push to remote
  log.info("Pushing commit and tags to remote...");
  await run("git", ["push"]);
  await run("git", ["push", "--tags"]);
  log.success("Commit and tags pushed to remote.");

  // 10. Create a GitHub release
  log.info("Creating GitHub release...");
  // Re-extract the changelog, which may have been edited in the review step
  releaseNotes = extractReleaseNotes();
  const releaseArgs = [
    "release",
    "create",
    tag,
    "--title",
    tag,
    "--notes",
    releaseNotes,
  ];

  // Add --prerelease flag if version contains a dash (alpha, beta, rc, etc.)
  if (version.includes("-")) {
    releaseArgs.push("--prerelease");
    log.info("Pre-release detected. Adding --prerelease flag.");
  }

  await run("gh", releaseArgs);

  if (DRY_RUN) {
    await execa("git", ["checkout", "package.json", "CHANGELOG.md"], {
      stdio: "inherit",
    });
    log.success("Dry-run completed and temporary changes have been reverted.");
  } else {
    log.success("Release process completed and published successfully!");
  }
}

main().catch((err) => {
  log.error("An unexpected error occurred:");
  console.error(err);
  process.exit(1);
});

# Fate Sphere
A platform that explores potential futures through meaningful number selection.

## Removing already pushed ignored files

Adding entries to .gitignore does not remove files that are already tracked and pushed.
You need to remove them from the Git index, commit that change, and push again.

### Remove a single tracked file

```bash
git rm --cached path/to/file
git commit -m "Stop tracking ignored file"
git push
```

### Remove a tracked directory

```bash
git rm -r --cached path/to/directory
git commit -m "Stop tracking ignored directory"
git push
```

### Re-apply .gitignore to the whole repository

```bash
git rm -r --cached .
git add .
git commit -m "Re-apply gitignore rules"
git push
```

Notes:

- The --cached option removes files from Git tracking only and keeps local files on disk.
- If sensitive data was already pushed, removing tracking is not enough. In that case, rewrite Git history and rotate the exposed secret.
- For the lt645 workspace, run the commands from the lt645 directory if you only want the local .gitignore there to apply.
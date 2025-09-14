package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/fsnotify/fsnotify"
)

// List of directories and files to ignore completely.
var ignoreList = []string{
	".git",
	"node_modules",
	".vscode",
	".cursor-workspace",
	"dist",
	"build",
	"__pycache__",
	"directory-tree.txt", // Don't include the output file in itself
	"watch.go",           // Don't include the script itself
	"go.mod",
	"go.sum",
	".next",
}

// The name of the output file for the directory tree.
const outputFileName = "directory-tree.txt"

func main() {
	// Create a new watcher.
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("Error creating watcher:", err)
	}
	defer watcher.Close()

	// Get the current working directory.
	rootDir, err := os.Getwd()
	if err != nil {
		log.Fatal("Error getting root directory:", err)
	}
	log.Printf("Starting watcher for directory: %s\n", rootDir)

	// Add all subdirectories to the watcher.
	err = filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		// Only watch directories.
		if info.IsDir() {
			// Check if the directory should be ignored.
			for _, item := range ignoreList {
				if info.Name() == item {
					return filepath.SkipDir // Skip this directory and all its contents.
				}
			}
			return watcher.Add(path)
		}
		return nil
	})
	if err != nil {
		log.Fatal("Error walking directory tree:", err)
	}

	// Initial generation of the directory tree.
	log.Println("Performing initial directory tree generation...")
	generateTree(rootDir)

	// Start a goroutine to process events.
	done := make(chan bool)
	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				// We only care about events that change the directory structure.
				if event.Has(fsnotify.Create) || event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
					log.Printf("Change detected: %s. Regenerating tree...\n", event.Name)
					generateTree(rootDir)
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Println("Watcher error:", err)
			}
		}
	}()

	<-done // Run forever.
}

// generateTree creates the directory tree and writes it to a file.
func generateTree(rootDir string) {
	var builder strings.Builder
	builder.WriteString(filepath.Base(rootDir) + "\n")

	err := filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip the root directory itself in the walk.
		if path == rootDir {
			return nil
		}

		// Check if the file/directory should be ignored.
		for _, item := range ignoreList {
			if strings.Contains(path, filepath.FromSlash("/"+item)) || info.Name() == item {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}
		
		relPath, err := filepath.Rel(rootDir, path)
		if err != nil {
			return err
		}

		depth := len(strings.Split(relPath, string(os.PathSeparator)))
		indent := strings.Repeat("│   ", depth-1)
		
		// Determine the prefix based on whether it's the last item in its directory.
		parentDir := filepath.Dir(path)
		entries, _ := os.ReadDir(parentDir)
		isLast := info.Name() == entries[len(entries)-1].Name()

		prefix := "├── "
		if isLast {
			prefix = "└── "
		}
		
		builder.WriteString(fmt.Sprintf("%s%s%s\n", indent, prefix, info.Name()))
		
		return nil
	})

	if err != nil {
		log.Printf("Error during tree generation: %v\n", err)
		return
	}

	err = os.WriteFile(outputFileName, []byte(builder.String()), 0644)
	if err != nil {
		log.Printf("Error writing to %s: %v\n", outputFileName, err)
	} else {
		log.Printf("Successfully updated %s\n", outputFileName)
	}
}
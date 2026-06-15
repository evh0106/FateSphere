import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [
        react(),
        {
            name: "source-file-path",
            transform: function (code, id) {
                var normalizedId = id.split("\\").join("/");
                if (normalizedId.indexOf("/src/") === -1 || code.indexOf("__SOURCE_FILE_PATH__") === -1) {
                    return null;
                }
                var workspaceMarker = "/fsWeb/";
                var markerIndex = normalizedId.lastIndexOf(workspaceMarker);
                var normalizedPath = markerIndex >= 0 ? normalizedId.slice(markerIndex + 1) : normalizedId;
                return {
                    code: code.split("__SOURCE_FILE_PATH__").join(JSON.stringify(normalizedPath)),
                    map: null
                };
            }
        }
    ],
    server: {
        port: 5173
    }
});

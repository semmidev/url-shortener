import JSZip from "jszip";

export function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "untitled";
}

function getModuleFileName(module) {
  if (module.file_name) {
    const dotIndex = module.file_name.lastIndexOf(".");
    if (dotIndex > 0) return module.file_name;
    return module.file_name + ".pdf";
  }
  return sanitizeFilename(module.name) + ".pdf";
}

function createVideoUrlContent(module) {
  return `[InternetShortcut]
URL=${module.video_url}
`;
}

function createResourceUrlContent(module) {
  return `[InternetShortcut]
URL=${module.resource_url}
`;
}

function addVideoReferenceFile(zip, module) {
  const name = sanitizeFilename(module.name) + ".url";
  zip.file(name, createVideoUrlContent(module));
}

function addResourceReferenceFile(zip, module) {
  const name = sanitizeFilename(module.name) + ".url";
  zip.file(name, createResourceUrlContent(module));
}

async function addModuleFileToZip(zip, module, accessToken, activeOrgId) {
  const fileName = getModuleFileName(module);
  const name = sanitizeFilename(module.name) + " - " + fileName;

  if (module.file_url) {
    try {
      const headers = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      if (activeOrgId) headers["X-Organization-ID"] = activeOrgId;
      const response = await fetch(module.file_url, { headers });
      if (response.ok) {
        const blob = await response.blob();
        zip.file(name, blob, { binary: true });
        return;
      }
    } catch {
      // ignore network fetch error and fallback to reference file
    }
  }

  if (module.video_url) {
    addVideoReferenceFile(zip, module);
  } else if (module.resource_url) {
    addResourceReferenceFile(zip, module);
  }
}

export async function downloadRepoZip(repo, modules, accessToken, activeOrgId) {
  const zip = new JSZip();
  const folderName = sanitizeFilename(repo.name);
  const folder = zip.folder(folderName);

  for (const module of modules) {
    await addModuleFileToZip(folder, module, accessToken, activeOrgId);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = folderName + ".zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadAllReposZip(reposWithModules, accessToken, activeOrgId) {
  const zip = new JSZip();

  for (const { repo, modules } of reposWithModules) {
    const folderName = sanitizeFilename(repo.name);
    const folder = zip.folder(folderName);
    for (const module of modules) {
      await addModuleFileToZip(folder, module, accessToken, activeOrgId);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "all-repositories-backup.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

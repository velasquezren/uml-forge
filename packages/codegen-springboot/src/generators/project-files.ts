import type { GeneratedFile } from '../types.js';
import { MAVEN_WRAPPER_PROPERTIES, MVNW_CMD, MVNW_SH } from './maven-wrapper-scripts.js';

const GITIGNORE = `target/
!.mvn/wrapper/maven-wrapper.jar
*.log
.idea/
*.iml
.vscode/
.DS_Store
`;

/**
 * Fija los finales de linea al clonar con Git en Windows: `mvnw` necesita LF
 * para ejecutarse en Linux y `mvnw.cmd` necesita CRLF para cmd.exe.
 */
const GITATTRIBUTES = `/mvnw text eol=lf
*.cmd text eol=crlf
`;

/** Maven Wrapper y ficheros de control de versiones del proyecto generado (ADR 0038). */
export function generateProjectFiles(): GeneratedFile[] {
  return [
    { path: 'mvnw', content: MVNW_SH, executable: true },
    { path: 'mvnw.cmd', content: MVNW_CMD },
    { path: '.mvn/wrapper/maven-wrapper.properties', content: MAVEN_WRAPPER_PROPERTIES },
    { path: '.gitignore', content: GITIGNORE },
    { path: '.gitattributes', content: GITATTRIBUTES },
  ];
}

export interface GeneratedCode {
    java: string;
    yml: string;
    className: string;
    packageName: string;
}

export type ActiveTab = 'java' | 'yml';
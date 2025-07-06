import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { generatePluginCode } from './services/geminiService';
import { GeneratedCode, ActiveTab } from './types';
import { CodeBlock } from './components/CodeBlock';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';

const createPomXml = (pluginName: string, version: string, className: string, packageName: string): string => {
    const groupId = packageName;
    const artifactId = className.toLowerCase();

    return `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>${version}</version>
    <packaging>jar</packaging>

    <name>${pluginName}</name>

    <properties>
        <java.version>1.8</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <build>
        <defaultGoal>clean package</defaultGoal>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.8.1</version>
                <configuration>
                    <source>${'${java.version}'}</source>
                    <target>${'${java.version}'}</target>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.2.4</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>shade</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>true</filtering>
            </resource>
        </resources>
    </build>

    <repositories>
        <repository>
            <id>spigotmc-repo</id>
            <url>https://hub.spigotmc.org/nexus/content/repositories/snapshots/</url>
        </repository>
        <repository>
            <id>sonatype</id>
            <url>https://oss.sonatype.org/content/groups/public/</url>
        </repository>
    </repositories>

    <dependencies>
        <dependency>
            <groupId>org.spigotmc</groupId>
            <artifactId>spigot-api</artifactId>
            <version>1.20.1-R0.1-SNAPSHOT</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>
</project>
    `.trim();
};

const App: React.FC = () => {
    const [pluginName, setPluginName] = useState('MyAwesomePlugin');
    const [version, setVersion] = useState('1.0.0');
    const [description, setDescription] = useState('A plugin that strikes lightning wherever a player right-clicks a block.');
    const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('java');

    const handleGenerate = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pluginName || !version || !description) {
            setError('Plugin Name, Version, and Description are required.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedCode(null);

        try {
            const code = await generatePluginCode(pluginName, version, description);
            setGeneratedCode(code);
            setActiveTab('java');
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate plugin code. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [pluginName, version, description]);

    const handleDownload = async () => {
        if (!generatedCode || !pluginName || !version) return;

        const { java, yml, className, packageName } = generatedCode;
        const pomXml = createPomXml(pluginName, version, className, packageName);
        const zip = new JSZip();

        zip.file('pom.xml', pomXml);

        const packagePath = packageName.replace(/\./g, '/');
        zip.file(`src/main/java/${packagePath}/${className}.java`, java);
        zip.file('src/main/resources/plugin.yml', yml);
        
        const readmeContent = `
# ${pluginName} Minecraft Plugin

This is a Spigot plugin project generated by the AI Spigot Plugin Generator.

## How to Build

To compile this project into a usable \`.jar\` file, you'll need to have **Java (JDK 8 or newer)** and **Apache Maven** installed on your system.

1.  Unzip this project folder.
2.  Open a terminal or command prompt and navigate into the project directory (the one with the \`pom.xml\` file).
3.  Run the following command:
    \`\`\`
    mvn clean package
    \`\`\`
4.  Once it's finished, you'll find the plugin file inside the \`target/\` directory. It will be named something like \`${className.toLowerCase()}-${version}.jar\`.
5.  Copy this \`.jar\` file into the \`plugins/\` folder of your Spigot server.
6.  Restart your server to enable the plugin.

        `.trim();
        zip.file('README.md', readmeContent);

        try {
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${className}-plugin-project.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch(err) {
            console.error("Failed to create zip file", err);
            setError("An error occurred while creating the zip file.");
        }
    };


    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-lg shadow-inner">
                    <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg text-gray-300">Generating your plugin...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="p-8 text-center bg-red-900/20 border border-red-500 rounded-lg">
                    <h3 className="text-xl font-bold text-red-400">An Error Occurred</h3>
                    <p className="mt-2 text-red-300">{error}</p>
                </div>
            );
        }
        
        if (generatedCode) {
            return (
                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-fade-in">
                    <div className="flex justify-between items-center border-b border-gray-700 bg-gray-800/50">
                        <div className="flex">
                            <button 
                                onClick={() => setActiveTab('java')}
                                className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === 'java' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                            >
                                {generatedCode.className}.java
                            </button>
                            <button 
                                onClick={() => setActiveTab('yml')}
                                className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === 'yml' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                            >
                                plugin.yml
                            </button>
                        </div>
                        <div className="pr-4">
                           <button 
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-200 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200 transform hover:scale-105"
                                title="Download the complete Maven project as a .zip file"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                Download Project
                            </button>
                        </div>
                    </div>
                    <div className="p-1 bg-gray-800">
                       {activeTab === 'java' && <CodeBlock code={generatedCode.java} language="java" />}
                       {activeTab === 'yml' && <CodeBlock code={generatedCode.yml} language="yaml" />}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        AI Spigot Plugin Generator
                    </h1>
                    <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                        Describe the Spigot plugin you want to create, and let our AI build the Java code and `plugin.yml` for you.
                    </p>
                </header>

                <main>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 sm:p-8 rounded-xl shadow-2xl mb-10">
                        <form onSubmit={handleGenerate}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label htmlFor="pluginName" className="block text-sm font-medium text-gray-300 mb-2">Plugin Name</label>
                                    <input
                                        type="text"
                                        id="pluginName"
                                        value={pluginName}
                                        onChange={(e) => setPluginName(e.target.value)}
                                        placeholder="e.g., LightningWand"
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="version" className="block text-sm font-medium text-gray-300 mb-2">Version</label>
                                    <input
                                        type="text"
                                        id="version"
                                        value={version}
                                        onChange={(e) => setVersion(e.target.value)}
                                        placeholder="e.g., 1.0.0"
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Plugin Description</label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="e.g., A plugin that gives players a diamond when they type '/claim'"
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow h-28 resize-y"
                                        required
                                    ></textarea>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-3 px-8 py-3 font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                >
                                    <SparklesIcon className="w-6 h-6" />
                                    {isLoading ? 'Generating...' : 'Generate Plugin'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="mt-10">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
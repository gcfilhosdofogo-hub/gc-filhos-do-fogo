@echo off
setlocal
set DIRNAME=%~dp0
set APP_HOME=%DIRNAME:~0,-1%
set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
if defined JAVA_HOME (
  "%JAVA_HOME%\bin\java" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
) else (
  java -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
)
endlocal
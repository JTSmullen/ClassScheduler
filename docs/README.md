# Read Me

### Features



- [X] R1 – Schedule add - A user should be able to add a course to a candidate schedule.



- [X] R2 – Schedule persistence - The system shall allow a user to save the candidate schedule that they have created and allow them to automatically reload it.



- [X] R3 - Calendar view - The user shall be able to view their candidate schedules in a Google calendar style view. Gaps between classes should be visible if the classes are not back to back.



- [X] R4 - Class search - A student should be able to restrict search results by some mechanism such as search term or filter for the following:

  - R4a - course name

  - R4b - keywords

  - R4c - professor

  - R4d - days and time range, eg: I should be able to restrict search results to only courses MWF after 10am 

  - R4e - department 

  - R4f - class code
  
  - R4g - credit hours.



- [X] R5 - Class Conflicts - A student should not be able to add a course to their schedule that overlaps with an existing course in the schedule. Instead, they will be alerted of the conflict. 

- [X] R6 - Class removal - A student should be able to remove a class from their schedule.

- [X] R7 - GUI - The student should be able to accomplish tasks using a GUI (not a clunky console).

- [X] R8 - Crashes - No action the user is able to perform should cause the software to crash.



### Software

* Temurin version 21.0.9
* Spring Boot
* Gradle 8.14.2
* Hibernate H2



### Getting started

#### 1. Clone the repository

```

git clone https://github.com/JTSmullen/ClassScheduler.git

```



```

cd ClassScheduler/ClassBackend

```



#### 2. Prerequisites

Make sure you have the following installed:

- Temurin version 21.0.9

- Gradle version 8.14.2

- Git

- IntelliJ



#### 3. Install dependencies 



Gradle wrapper will have correct version in the project. The correct Gradle version should be installed if you build the project with

```

./gradlew clean build

```



#### 4. Run the application

The jar file should automatically be built once the project is built. To run the jar file, use

```

java -jar .\\build\\libs\\ClassScheduler-1.0.0.jar

```



#### 5. Access the application

Default URL:

```

http://localhost:63342/ClassScheduler/ClassFrontend/index.html?\_ijt=njqqq596ghup375tg8skvc2dh2\&\_ij\_reload=RELOAD\_ON\_SAVE

```



#### Authors

Christian Viekman, Carl Foerster, Joshua Smullen, George Rule




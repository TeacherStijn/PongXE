/* 
    Opties voor het Retourneren van Data uit PL/SQL

    SYS_REFCURSOR:
    Dit is een flexibele manier om een resultaatset te retourneren die dynamisch kan variëren in grootte.
    Cursoren zijn ideaal voor interactie met client-applicaties zoals een Node.js-backend, waar de data verwerkt kan worden als een stroom, waardoor het geheugengebruik efficiënt wordt beheerd.
    Collectie Types (Associative Arrays, Varrays, Nested Tables):

    COMPLEXE TYPEN:
    Je kunt ook data retourneren in de vorm van PL/SQL collecties zoals associative arrays, varrays, of nested tables.
    Deze methoden kunnen effectief zijn als je een vast aantal elementen verwacht of als je alle resultaten tegelijkertijd nodig hebt, zonder de noodzaak om ze één voor één te verwerken zoals bij cursors.
    Echter, de ondersteuning voor het direct overdragen van deze collectietypes naar client-applicaties zoals Node.js via standaard database drivers kan beperkt of complex zijn.
*/

CREATE OR REPLACE PACKAGE game IS
    FUNCTION getPlayerPool (p_aantal IN NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION loginUser (p_username IN VARCHAR2, p_password IN VARCHAR2) RETURN BOOLEAN;
END game;
/

CREATE OR REPLACE PACKAGE BODY game IS
    FUNCTION loginUser (p_username IN VARCHAR2, p_wachtwoord IN VARCHAR2) RETURN BOOLEAN IS
        v_user speler%type;
        resultaat BOOLEAN := false;
    BEGIN
        SELECT * INTO v_user FROM spelers WHERE lower(gebruikersnaam) = ' || lower(p_username) || ' AND wachtwoord = ' || p_wachtwoord || ';
        IF v_user%notfound THEN
            resultaat := false;
        ELSE
            resultaat := true;
        END IF;
    END loginUser;

    FUNCTION getPlayerPool (p_aantal IN NUMBER) RETURN SYS_REFCURSOR IS
        resultaat SYS_REFCURSOR;
        v_aantal NUMBER;
    BEGIN
        -- evt hier nog check op v_aantal > 0 bijv
        v_aantal := p_aantal;
        OPEN resultaat FOR
            SELECT id, alias FROM spelers FETCH FIRST v_aantal ROWS ONLY;
        RETURN resultaat;
    END getPlayerPool;
END game;
/
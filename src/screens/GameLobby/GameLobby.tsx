import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Share2 } from "lucide-react";
import type { Player, Game, Category as GameCategory, Question as GameQuestion, Round as GameRound } from "../../lib/types";

// Usar un servicio de avatares generados
const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;

export const GameLobby = (): JSX.Element => {
  console.log("GameLobby renderizado");

  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [firstPlayer, setFirstPlayer] = useState<Player | null>(null);
  const playerName = location.state?.playerName;
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showGameName, setShowGameName] = useState(false);

  const ensureQuestionsExist = async () => {
    try {
      const { data: existingQuestions, error: qError } = await supabase
        .from('questions')
        .select('id')
        .limit(1);

      if (qError) throw qError;

      if (existingQuestions && existingQuestions.length > 0) {
        console.log('✅ Preguntas existentes en la base de datos');
        return;
      }

      console.log('⚠️ No se encontraron preguntas, creando preguntas predeterminadas...');

      // 1. Definir categorías base y obtener/crear sus IDs
      const baseCategoryNames = ['pelicula', 'sigla', 'personaje'];
      let categoriesData: GameCategory[] = [];

      const { data: existingCategories, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .in('name', baseCategoryNames);

      if (catError) throw catError;
      categoriesData = existingCategories || [];

      const existingNames = categoriesData.map(c => c.name);
      const missingNames = baseCategoryNames.filter(name => !existingNames.includes(name));

      if (missingNames.length > 0) {
        const { data: newCategories, error: insertCatError } = await supabase
          .from('categories')
          .insert(missingNames.map(name => ({ name })))
          .select('id, name');
        if (insertCatError) throw insertCatError;
        if (newCategories) {
          categoriesData = [...categoriesData, ...newCategories];
        }
      }
      
      const categoryMap = categoriesData.reduce((acc, cat) => {
        acc[cat.name] = cat.id;
        return acc;
      }, {} as Record<string, string>);

      if (!categoryMap['pelicula'] || !categoryMap['sigla'] || !categoryMap['personaje']) {
        console.error('Error: No se pudieron obtener IDs para todas las categorías base', categoryMap);
        throw new Error('Faltan IDs de categorías base después de la inserción/obtención.');
      }

      // 2. Preguntas por defecto usando category_id
      const defaultQuestionsData = [
        { category_id: categoryMap['pelicula'], type: 1, text: '¿Qué película es esta?', content: 'Titanic', correct_answer: 'James Cameron' },
        { category_id: categoryMap['pelicula'], type: 1, text: '¿Qué película es esta?', content: 'El Padrino', correct_answer: 'Francis Ford Coppola' },
        { category_id: categoryMap['pelicula'], type: 1, text: '¿Qué película es esta?', content: 'Matrix', correct_answer: 'Hermanas Wachowski' },
        { category_id: categoryMap['pelicula'], type: 1, text: '¿Qué película es esta?', content: 'Pulp Fiction', correct_answer: 'Quentin Tarantino' },
        { category_id: categoryMap['pelicula'], type: 1, text: '¿Qué película es esta?', content: 'El Rey León', correct_answer: 'Disney' },
        
        { category_id: categoryMap['sigla'], type: 2, text: '¿Qué significan estas siglas?', content: 'ONU', correct_answer: 'Organización de las Naciones Unidas' },
        { category_id: categoryMap['sigla'], type: 2, text: '¿Qué significan estas siglas?', content: 'NASA', correct_answer: 'National Aeronautics and Space Administration' },
        { category_id: categoryMap['sigla'], type: 2, text: '¿Qué significan estas siglas?', content: 'FBI', correct_answer: 'Federal Bureau of Investigation' },
        
        { category_id: categoryMap['personaje'], type: 3, text: '¿Quién es este personaje?', content: 'Darth Vader', correct_answer: 'Star Wars' },
        { category_id: categoryMap['personaje'], type: 3, text: '¿Quién es este personaje?', content: 'Harry Potter', correct_answer: 'Saga Harry Potter' },
        { category_id: categoryMap['personaje'], type: 3, text: '¿Quién es este personaje?', content: 'Spider-Man', correct_answer: 'Marvel Comics' }
      ];
      
      const { error: insertError } = await supabase
        .from('questions')
        .insert(defaultQuestionsData);
      
      if (insertError) throw insertError;
      
      console.log('✅ Preguntas predeterminadas creadas exitosamente con category_id');
    } catch (err) {
      console.error('❌ Error al verificar/crear preguntas:', err);
      // Podrías querer establecer un estado de error aquí para el usuario
    }
  };

  useEffect(() => {
    if (!gameId || !playerName) return;

    let gameSubscription: any;

    const setupSubscriptions = async () => {
      try {
        // Suscribirse a cambios en el juego
        gameSubscription = supabase
          .channel(`game-${gameId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'games',
              filter: `id=eq.${gameId}`
            },
            async (payload) => {
              const gameData = payload.new as Game;
              setGame(gameData);
              
              // Si el juego ha comenzado, obtener la ronda activa
              if (gameData.started) {
                // MODIFICADO: Seleccionar category_id y el nombre de la categoría
                const { data: activeRound } = await supabase
                  .from('rounds')
                  .select('*, categories ( name )') // Obtener el nombre de la categoría
                  .eq('game_id', gameId)
                  .eq('active', true)
                  .single();

                if (activeRound) {
                  const roundWithCategoryName = {
                    ...activeRound,
                    // @ts-ignore Supabase a veces anida la relación así
                    category_name: activeRound.categories?.name || 'Desconocida' 
                  };
                  // MODIFICADO: Pasar category_id y category_name
                  navigate(`/game/${gameId}/round/intro`, {
                    state: { 
                      playerName,
                      roundNumber: roundWithCategoryName.number,
                      roundId: roundWithCategoryName.id,
                      moderatorId: roundWithCategoryName.moderator_id,
                      category_id: roundWithCategoryName.category_id, // Pasar ID
                      category_name: roundWithCategoryName.category_name // Pasar nombre
                    }
                  });
                }
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error('Error setting up subscriptions:', err);
      }
    };

    setupSubscriptions();

    return () => {
      if (gameSubscription) {
        gameSubscription.unsubscribe();
      }
    };
  }, [gameId, playerName, navigate]);

  useEffect(() => {
    if (!gameId) return;

    const fetchGameAndPlayers = async () => {
      try {
        // Asegurar que existan preguntas en la base de datos
        await ensureQuestionsExist();
        
        // Fetch game
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError) throw gameError;
        setGame(gameData);

        // Si el juego ya está iniciado, obtener la ronda activa
        if (gameData.started) {
          // MODIFICADO: Seleccionar category_id y el nombre de la categoría
          const { data: activeRound } = await supabase
            .from('rounds')
            .select('*, categories ( name )') // Obtener nombre de categoría
            .eq('game_id', gameId)
            .eq('active', true)
            .single();

          if (activeRound) {
            const roundWithCategoryName = {
              ...activeRound,
              // @ts-ignore
              category_name: activeRound.categories?.name || 'Desconocida'
            };
            // MODIFICADO: Pasar category_id y category_name
            navigate(`/game/${gameId}/round/intro`, {
              state: { 
                playerName,
                roundNumber: roundWithCategoryName.number,
                roundId: roundWithCategoryName.id,
                moderatorId: roundWithCategoryName.moderator_id,
                category_id: roundWithCategoryName.category_id,
                category_name: roundWithCategoryName.category_name
              }
            });
          }
          return;
        }

        // Fetch players si el juego no ha comenzado
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)
          .order('created_at', { ascending: true });

        if (playersError) throw playersError;
        if (playersData) {
          setPlayers(playersData);
          
          // El primer jugador es el primero en la lista (orden por created_at)
          setFirstPlayer(playersData[0]);
          
          // Identificar el jugador actual
          const currentPlayer = playersData.find(p => p.name === playerName);
          if (currentPlayer) {
            setCurrentPlayerId(currentPlayer.id);
          }
        }
      } catch (err) {
        console.error('Error fetching game data:', err);
        setError('Error al cargar los datos del juego');
      }
    };

    fetchGameAndPlayers();

    const intervalId = setInterval(fetchGameAndPlayers, 2000);

    return () => clearInterval(intervalId);
  }, [gameId, playerName, navigate]);

  // Determinar si el jugador actual es el primero
  const isFirstPlayer = currentPlayerId && firstPlayer && currentPlayerId === firstPlayer.id;

  const handleStartGame = async () => {
    if (!gameId || players.length < 2 || isStartingGame) return;

    setIsStartingGame(true);

    try {
      console.log('🎮 Iniciando juego...');
      
      // MODIFICADO: obtener questions con category_id y el nombre de la categoría
      const { data: allQuestionsData, error: allQuestionsError } = await supabase
        .from('questions')
        .select('id, category_id, categories ( name )'); // Incluir el nombre de la categoría
      
      if (allQuestionsError) throw allQuestionsError;

      // Mapear para tener una estructura más plana si es necesario, o usarla directamente
      const allQuestions = allQuestionsData?.map(q => ({
        ...q,
        // @ts-ignore
        category_name: q.categories?.name 
      })) || [];
      
      console.log('🔍 Todas las preguntas (con category_id y name):', allQuestions);
      
      if (!allQuestions || allQuestions.length === 0) {
        // La lógica de ensureQuestionsExist debería haber prevenido esto,
        // pero si llegamos aquí, es un error grave.
        console.error('Critical Error: No questions found after ensureQuestionsExist was supposed to run.');
        setError('Error crítico: No se encontraron preguntas. Intenta recargar.');
        setIsStartingGame(false);
        return;
      }
      
      // Agrupar preguntas por category_id
      const questionsByCategoryId: Record<string, GameQuestion[]> = {};
      allQuestions.forEach((question : any) => { // any por la estructura anidada temporalmente
        if (!questionsByCategoryId[question.category_id]) {
          questionsByCategoryId[question.category_id] = [];
        }
        questionsByCategoryId[question.category_id].push(question as GameQuestion);
      });
      
      console.log('📋 Preguntas disponibles por category_id:', 
        Object.fromEntries(
          Object.entries(questionsByCategoryId).map(([k, v]) => [k, v.length])
        )
      );
      
      const uniqueCategoryIds = Object.keys(questionsByCategoryId);
      if (uniqueCategoryIds.length === 0) {
        throw new Error('No hay preguntas agrupadas por categorías disponibles.');
      }
      
      const roundCategoryIds = [...uniqueCategoryIds];
      while (roundCategoryIds.length < 4 && uniqueCategoryIds.length > 0) {
        roundCategoryIds.push(uniqueCategoryIds[0]); // Repetir si no hay suficientes
      }
      
      const roundsToInsert = [];
      for (let i = 0; i < 4; i++) {
        const selectedCategoryId = roundCategoryIds[i % roundCategoryIds.length];
        const questionsInCat = questionsByCategoryId[selectedCategoryId];
        
        if (!questionsInCat || questionsInCat.length === 0) {
          console.warn(`⚠️ No hay preguntas para category_id ${selectedCategoryId}, saltando...`);
          continue;
        }
        
        const randomIndex = Math.floor(Math.random() * questionsInCat.length);
        const selectedQuestion = questionsInCat[randomIndex];
        const moderator = players[i % players.length];
        
        roundsToInsert.push({
          game_id: gameId,
          number: i + 1,
          moderator_id: moderator.id,
          category_id: selectedQuestion.category_id, // Usar category_id
          active: i === 0,
          question_id: selectedQuestion.id,
          voting_phase: false,
          reading_phase: false,
          results_phase: false
        });
      }
      
      console.log('🔄 Rondas configuradas para insertar:', roundsToInsert.length);
      
      if (roundsToInsert.length === 0) {
        throw new Error('No se pudieron crear rondas con las preguntas disponibles y category_id.');
      }

      // Insertar todas las rondas
      // MODIFICADO: Se usa GameRound de los tipos importados
      const { data: roundsData, error: insertRoundsError } = await supabase
        .from('rounds')
        .insert(roundsToInsert)
        .select() as { data: GameRound[] | null, error: any }; // Especificar tipo GameRound

      if (insertRoundsError) throw insertRoundsError;

      if (roundsData && roundsData.length > 0) {
        await supabase
        .from('games')
        .update({ 
          started: true,
            current_round_id: roundsData[0].id 
        })
        .eq('id', gameId);
      }

      console.log('✅ Juego iniciado correctamente');
      
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Error al iniciar el juego');
      setIsStartingGame(false);
    }
  };

  // Añadir función para compartir
  const handleShare = async () => {
    // Crear la URL para unirse a la partida
    const shareUrl = `${window.location.origin}/game/${gameId}`;
    
    // Verificar si la API de compartir está disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: `¡Únete a ${game?.name || 'nuestra partida'}!`,
          text: '¡Ven a jugar Bullshit con nosotros!',
          url: shareUrl
        });
        console.log('Enlace compartido con éxito');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error al compartir:', error);
        }
      }
    } else {
      // Fallback para navegadores que no soportan la API Share
      try {
        await navigator.clipboard.writeText(shareUrl);
        // Aquí podrías mostrar un toast o notificación
        alert('Enlace copiado al portapapeles');
      } catch (error) {
        console.error('Error al copiar al portapapeles:', error);
        // Fallback manual
        prompt('Copia este enlace para compartir la partida:', shareUrl);
      }
    }
  };

  // Efecto para las animaciones secuenciales
  useEffect(() => {
    // Mostrar título después de 100ms
    const titleTimer = setTimeout(() => setShowTitle(true), 100);
    
    // Mostrar subtítulo después de 600ms
    const subtitleTimer = setTimeout(() => setShowSubtitle(true), 600);
    
    // Mostrar nombre del juego después de 1100ms
    const gameNameTimer = setTimeout(() => setShowGameName(true), 1100);
    
    return () => {
      clearTimeout(titleTimer);
      clearTimeout(subtitleTimer);
      clearTimeout(gameNameTimer);
    };
  }, []);

  if (error) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen px-6">
        <div className="mt-6">
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-6 h-6 text-[#131309]" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mb-16">
            BULLSHIT
          </h1>
          <div className="w-full max-w-[327px] bg-white rounded-[20px] p-5 space-y-5">
            <h2 className="font-bold text-xl text-[#131309]">Error</h2>
            <p className="text-base text-[#131309]">{error}</p>
            <Button
              className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center pb-32">
      <div className="mt-8 flex flex-col items-center">
        <h1 
          className={`[font-family:'Londrina_Solid'] text-[32px] sm:text-[40px] text-[#131309] transform transition-opacity duration-500 ease-in-out whitespace-nowrap ${
            showTitle ? 'opacity-100' : 'opacity-0'
          }`}
        >
          BULLSHIT
        </h1>
        
        <p 
          className={`text-[#131309] text-base sm:text-lg mt-0 transform transition-opacity duration-500 ease-in-out whitespace-nowrap ${
            showSubtitle ? 'opacity-100' : 'opacity-0'
          }`}
        >
          presenta a...
        </p>

        <h2 
          className={`[font-family:'Londrina_Solid'] text-[30px] sm:text-[38px] text-[#131309] mt-1 text-center transform transition-opacity duration-500 ease-in-out whitespace-nowrap ${
            showGameName ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {game?.name?.toUpperCase()}
            </h2>
          </div>

      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#131309] text-xl">
            {players.length} {players.length === 1 ? 'jugador' : 'jugadores'} en la partida
          </p>
          <button className="text-[#131309]" onClick={handleShare}>
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 bg-[#E7E7E6] rounded-[10px]"
              >
              <img 
                src={getAvatarUrl(player.name)} 
                alt="Avatar"
                className="w-12 h-12 rounded-full object-cover bg-gray-100"
              />
              <span className="flex-1 text-[#131309] text-lg">
                  {player.name}
                  {player.id === currentPlayerId && " (Tú)"}
                </span>
              </div>
            ))}
        </div>
          </div>

      {/* Panel fijo en la parte inferior solo para el primer jugador */}
      {isFirstPlayer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto space-y-4">
            <p className="text-[#131309] text-center">
              Eres el primero en llegar. Comienza la partida cuando estéis todos aquí.
            </p>
          <Button
              className="w-full h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
            onClick={handleStartGame}
              disabled={isStartingGame}
          >
              {isStartingGame ? "Iniciando..." : "Comenzar partida"}
          </Button>
        </div>
      </div>
      )}

      {/* Panel fijo en la parte inferior para jugadores no primeros */}
      {!isFirstPlayer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto">
            <p className="text-[#131309] text-center">
              {firstPlayer?.name || 'El primer jugador'} comenzará la partida cuando lleguéis todos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
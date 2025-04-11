import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Share2 } from "lucide-react";
import type { Player, Game } from "../../lib/types";
import { initializeGameQuestions, getQuestionForRound } from '../../services/questionService';
import { usePlayer } from "../../contexts/PlayerContext";

// Usar un servicio de avatares generados
const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;

<<<<<<< HEAD
// Añadir esta función para mapear categorías
const mapCategory = (questionCategory: string): string => {
  // Normalizar la categoría (quitar acentos, minúsculas, etc.)
  const normalized = questionCategory?.trim()?.toLowerCase() || '';
  
  // Mapear a las categorías permitidas
  switch (normalized) {
    case 'pelicula':
    case 'peliculas':
    case 'películas':
    case 'película':
      return 'Peliculas';
      
    case 'sigla':
    case 'siglas':
      return 'Siglas';
      
    case 'personaje':
    case 'personajes':
      return 'Personajes';
      
    case 'palabra':
    case 'palabras':
      return 'Palabras';
      
    case 'muerte':
    case 'muertes':
      return 'Muertes';
      
    case 'idioma':
    case 'idiomas':
      return 'Idiomas';
      
    default:
      // Si no coincide, usar una categoría por defecto segura
      console.warn(`Categoría desconocida: "${questionCategory}", usando "Peliculas" como fallback`);
      return 'Peliculas';
  }
};
=======
// Asegurarnos de que rounds tenga el tipo correcto
interface Round {
  id: string;
  game_id: string;
  number: number;
  moderator_id: string;
  category: string;
  active: boolean;
  question_id: string;
  voting_phase: boolean;
  reading_phase: boolean;
  results_phase: boolean;
}
>>>>>>> fix/question-data-issue

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
<<<<<<< HEAD
  const { playerId, playerName } = usePlayer();
  const [showPresenta, setShowPresenta] = useState(false);
  const [showGameName, setShowGameName] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
=======
  const [firstPlayer, setFirstPlayer] = useState<Player | null>(null);
  const playerName = location.state?.playerName;
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showGameName, setShowGameName] = useState(false);

  const ensureQuestionsExist = async () => {
    try {
      // Verificar si ya existen preguntas
      const { data: existingQuestions, error } = await supabase
        .from('questions')
        .select('category')
        .limit(1);
      
      if (error) throw error;
      
      // Si ya hay preguntas, no hacer nada
      if (existingQuestions && existingQuestions.length > 0) {
        console.log('✅ Preguntas existentes en la base de datos');
        return;
      }
      
      console.log('⚠️ No se encontraron preguntas, creando preguntas predeterminadas...');
      
      // Preguntas por defecto para cada categoría
      const defaultQuestions = [
        // Películas
        { category: 'pelicula', type: 1, text: '¿Qué película es esta?', content: 'Titanic', correct_answer: 'James Cameron' },
        { category: 'pelicula', type: 1, text: '¿Qué película es esta?', content: 'El Padrino', correct_answer: 'Francis Ford Coppola' },
        { category: 'pelicula', type: 1, text: '¿Qué película es esta?', content: 'Matrix', correct_answer: 'Hermanas Wachowski' },
        { category: 'pelicula', type: 1, text: '¿Qué película es esta?', content: 'Pulp Fiction', correct_answer: 'Quentin Tarantino' },
        { category: 'pelicula', type: 1, text: '¿Qué película es esta?', content: 'El Rey León', correct_answer: 'Disney' },
        
        // Siglas
        { category: 'sigla', type: 2, text: '¿Qué significan estas siglas?', content: 'ONU', correct_answer: 'Organización de las Naciones Unidas' },
        { category: 'sigla', type: 2, text: '¿Qué significan estas siglas?', content: 'NASA', correct_answer: 'National Aeronautics and Space Administration' },
        { category: 'sigla', type: 2, text: '¿Qué significan estas siglas?', content: 'FBI', correct_answer: 'Federal Bureau of Investigation' },
        
        // Personajes
        { category: 'personaje', type: 3, text: '¿Quién es este personaje?', content: 'Darth Vader', correct_answer: 'Star Wars' },
        { category: 'personaje', type: 3, text: '¿Quién es este personaje?', content: 'Harry Potter', correct_answer: 'Saga Harry Potter' },
        { category: 'personaje', type: 3, text: '¿Quién es este personaje?', content: 'Spider-Man', correct_answer: 'Marvel Comics' }
      ];
      
      // Insertar las preguntas
      const { error: insertError } = await supabase
        .from('questions')
        .insert(defaultQuestions);
      
      if (insertError) throw insertError;
      
      console.log('✅ Preguntas predeterminadas creadas exitosamente');
    } catch (err) {
      console.error('❌ Error al verificar/crear preguntas:', err);
    }
  };
>>>>>>> fix/question-data-issue

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
                const { data: activeRound } = await supabase
                  .from('rounds')
                  .select('*')
                  .eq('game_id', gameId)
                  .eq('active', true)
                  .single();

                if (activeRound) {
                  // Navegar a la pantalla introductoria con toda la información necesaria
                  navigate(`/game/${gameId}/round/intro`, {
                    state: { 
                      playerName,
                      roundNumber: activeRound.number,
                      roundId: activeRound.id,
                      moderatorId: activeRound.moderator_id,
                      category: activeRound.category
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
          .select('*, creator_id')
          .eq('id', gameId)
          .single();

        console.log('Datos del juego cargados:', gameData);
        console.log('creator_id del juego:', gameData.creator_id);

        if (gameError) throw gameError;
        setGame(gameData);

        // Si el juego ya está iniciado, obtener la ronda activa
        if (gameData.started) {
          const { data: activeRound } = await supabase
            .from('rounds')
            .select('*')
            .eq('game_id', gameId)
            .eq('active', true)
            .single();

          if (activeRound) {
            navigate(`/game/${gameId}/round/intro`, {
              state: { 
                playerName,
                roundNumber: activeRound.number,
                roundId: activeRound.id,
                moderatorId: activeRound.moderator_id,
                category: activeRound.category
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
<<<<<<< HEAD
          const player = playersData.find(p => p.name === playerName);
          console.log('Encontrado jugador actual:', player);
          if (player) {
            console.log('Asignando currentPlayerId:', player.id);
            setCurrentPlayerId(player.id);
=======
          
          // El primer jugador es el primero en la lista (orden por created_at)
          setFirstPlayer(playersData[0]);
          
          // Identificar el jugador actual
          const currentPlayer = playersData.find(p => p.name === playerName);
          if (currentPlayer) {
            setCurrentPlayerId(currentPlayer.id);
>>>>>>> fix/question-data-issue
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
    try {
<<<<<<< HEAD
      if (!gameId) {
        console.error('GameId is undefined');
        return;
      }

      setIsStartingGame(true);
      
      // 1. Inicializar preguntas para el juego
      const initialized = await initializeGameQuestions(gameId);
      
      if (!initialized) {
        console.error('Error inicializando preguntas');
        setIsStartingGame(false);
        return;
      }
      
      // 2. Obtener preguntas para todas las rondas (vamos a crear 5 rondas)
      const totalRounds = 5;
      const rounds = [];
      
      for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber++) {
        // Obtener pregunta para esta ronda
        const question = await getQuestionForRound(gameId, roundNumber);
        
        if (!question) {
          console.error(`No se pudo obtener una pregunta para la ronda ${roundNumber}`);
          continue;
        }
        
        // Seleccionar moderador para esta ronda (rotando entre jugadores)
        const moderatorIndex = (roundNumber - 1) % players.length;
        const moderatorId = players[moderatorIndex].id;
        
        // Añadir la ronda a la lista
        rounds.push({
          game_id: gameId,
          number: roundNumber,
          moderator_id: moderatorId,
          question_id: question.id,
          active: roundNumber === 1, // Solo la primera ronda empieza activa
          category: mapCategory(question.category), // Convertir a categoría válida
=======
      console.log('🎮 Iniciando juego...');
      
      // DIAGNÓSTICO: Primero obtener TODAS las preguntas sin filtrar
      const { data: allQuestions, error: allQuestionsError } = await supabase
        .from('questions')
        .select('id, category');
      
      if (allQuestionsError) throw allQuestionsError;
      
      console.log('🔍 Todas las preguntas:', allQuestions);
      
      // Si no hay preguntas en absoluto, crearlas manualmente
      if (!allQuestions || allQuestions.length === 0) {
        console.log('⚠️ No hay preguntas en la base de datos, insertando manualmente...');
        
        // Preguntas por defecto para cada categoría
        const defaultQuestions = [
          // Películas
          { category: 'pelicula', type: 1, text: '¿Qué película es esta?', content: 'Titanic', correct_answer: 'James Cameron' },
          { category: 'pelicula', type: 1, text: '¿Qué película es esta?', content: 'El Padrino', correct_answer: 'Francis Ford Coppola' },
          { category: 'pelicula', type: 1, text: '¿Qué película es esta?', content: 'Matrix', correct_answer: 'Hermanas Wachowski' },
          
          // Siglas
          { category: 'sigla', type: 2, text: '¿Qué significan estas siglas?', content: 'ONU', correct_answer: 'Organización de las Naciones Unidas' },
          { category: 'sigla', type: 2, text: '¿Qué significan estas siglas?', content: 'NASA', correct_answer: 'National Aeronautics and Space Administration' },
          
          // Personajes
          { category: 'personaje', type: 3, text: '¿Quién es este personaje?', content: 'Darth Vader', correct_answer: 'Star Wars' },
          { category: 'personaje', type: 3, text: '¿Quién es este personaje?', content: 'Harry Potter', correct_answer: 'Saga Harry Potter' },
        ];
        
        // Insertar las preguntas
        const { data: insertedQuestions, error: insertError } = await supabase
          .from('questions')
          .insert(defaultQuestions)
          .select();
        
        if (insertError) throw insertError;
        
        // Usar estas preguntas recién insertadas
        const movieQuestions = insertedQuestions.filter(q => q.category === 'pelicula');
        const siglaQuestions = insertedQuestions.filter(q => q.category === 'sigla');
        const characterQuestions = insertedQuestions.filter(q => q.category === 'personaje');
        
        console.log('✅ Preguntas insertadas manualmente:', insertedQuestions.length);
        
        // Crear el pool con estas preguntas
        const questionsByCategory = {
          pelicula: movieQuestions || [],
          sigla: siglaQuestions || [],
          personaje: characterQuestions || []
        };
        
        console.log('📋 Preguntas disponibles después de inserción manual:', {
          pelicula: questionsByCategory.pelicula.length,
          sigla: questionsByCategory.sigla.length,
          personaje: questionsByCategory.personaje.length
        });
        
        // Continuar con la lógica existente usando estas preguntas
        
        // ...resto del código...
        
        return;
      }
      
      // Si hay preguntas pero las categorías están mal, intentar adaptarse
      // Obtener las categorías que realmente existen en la base de datos
      const uniqueCategories = [...new Set(allQuestions.map(q => q.category))];
      console.log('🏷️ Categorías existentes:', uniqueCategories);
      
      // Agrupar las preguntas por las categorías que existan realmente
      const questionsByCategory: Record<string, any[]> = {};
      uniqueCategories.forEach(category => {
        questionsByCategory[category] = allQuestions.filter(q => q.category === category);
      });
      
      console.log('📋 Preguntas disponibles por categoría real:', 
        Object.fromEntries(
          Object.entries(questionsByCategory).map(([k, v]) => [k, v.length])
        )
      );
      
      // Verificar si hay suficientes preguntas
      const totalQuestions = allQuestions.length;
      
      if (totalQuestions === 0) {
        throw new Error('No hay preguntas disponibles en la base de datos');
      }
      
      // 2. Definir categorías para cada ronda basándose en las categorías reales que existan
      const roundCategories = [...uniqueCategories];
      
      // Si no hay suficientes categorías, repetir las existentes
      while (roundCategories.length < 4) {
        roundCategories.push(uniqueCategories[0]);
      }
      
      // 3. Crear las 4 rondas con preguntas aleatorias
      const rounds = [];
      for (let i = 0; i < 4; i++) {
        const category = roundCategories[i % roundCategories.length];
        const questions = questionsByCategory[category];
        
        if (!questions || questions.length === 0) {
          console.warn(`⚠️ No hay preguntas para la categoría ${category}, saltando...`);
          continue;
        }
        
        // Seleccionar una pregunta aleatoria
        const randomIndex = Math.floor(Math.random() * questions.length);
        const selectedQuestion = questions[randomIndex];
        
        // Asignar un moderador (rotando entre los jugadores)
        const moderator = players[i % players.length];
        
        rounds.push({
          game_id: gameId,
          number: i + 1,
          moderator_id: moderator.id,
          category: category,
          active: i === 0,
          question_id: selectedQuestion.id,
>>>>>>> fix/question-data-issue
          voting_phase: false,
          reading_phase: false,
          results_phase: false
        });
      }
      
<<<<<<< HEAD
      // 3. Insertar todas las rondas en la base de datos
      const { data: createdRounds, error: roundsError } = await supabase
        .from('rounds')
        .insert(rounds)
        .select();
      
      if (roundsError) {
        console.error('Error creando las rondas:', roundsError);
        throw roundsError;
      }
      
      console.log(`Creadas ${createdRounds?.length || 0} rondas para el juego`);
      
      // 4. Actualizar el estado del juego con la primera ronda
      const firstRoundId = createdRounds?.[0]?.id;
      
      if (!firstRoundId) {
        throw new Error('No se pudo obtener el ID de la primera ronda');
      }
      
      await supabase
        .from('games')
        .update({ 
          started: true,
          current_round_id: firstRoundId
        })
        .eq('id', gameId);
      
      // Continuar con el código existente...
    } catch (error) {
      console.error('Error al iniciar el juego:', error);
=======
      console.log('🔄 Rondas configuradas:', rounds.length);
      
      if (rounds.length === 0) {
        throw new Error('No se pudieron crear rondas con las preguntas disponibles');
      }

      // 4. Insertar todas las rondas
      const { data: roundsData } = await supabase
        .from('rounds')
        .insert(rounds)
        .select() as { data: Round[] };

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
>>>>>>> fix/question-data-issue
      setIsStartingGame(false);
    }
  };

<<<<<<< HEAD
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/join/${gameId}`;
    
    try {
      // Intentar usar la API Web Share si está disponible
      if (navigator.share) {
        await navigator.share({
          title: `Únete a ${game?.name} en BULLSHIT`,
          text: '¡Únete a nuestra partida de BULLSHIT!',
          url: shareUrl
        });
      } else {
        // Si Web Share no está disponible, copiar al portapapeles
        await navigator.clipboard.writeText(shareUrl);
        setShowSnackbar(true);
        setTimeout(() => {
          setShowSnackbar(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };
=======

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
>>>>>>> fix/question-data-issue

  useEffect(() => {
    console.log('=== DEPURACIÓN CREADOR ===');
    console.log('currentPlayerId:', currentPlayerId);
    console.log('game?.creator_id:', game?.creator_id);
    console.log('Son iguales?', currentPlayerId === game?.creator_id);
    console.log('Tipo de currentPlayerId:', typeof currentPlayerId);
    console.log('Tipo de game?.creator_id:', typeof game?.creator_id);
    console.log('Jugadores:', players);
    console.log('========================');
  }, [currentPlayerId, game, players]);

  // Efecto para controlar la secuencia de animación
  useEffect(() => {
    // Mostrar "presenta a..." después de 500ms
    const presentaTimer = setTimeout(() => {
      setShowPresenta(true);
    }, 500);

    // Mostrar el nombre del juego después de 1000ms
    const gameNameTimer = setTimeout(() => {
      setShowGameName(true);
    }, 1000);

    return () => {
      clearTimeout(presentaTimer);
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
<<<<<<< HEAD
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <>
        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-2 animate-fade-in">
          BULLSHIT
        </h1>
      </>
      
      <p 
        className={`
          text-[#131309] text-xl mt-0 
          transition-opacity duration-500 
          ${showPresenta ? 'opacity-100' : 'opacity-0'}
        `}
      >
        presenta a...
      </p>

      <h2 
        className={`
          [font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-1 text-center
          transition-all duration-500
          ${showGameName 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-4'
          }
        `}
      >
        {game?.name?.toUpperCase()}
      </h2>

=======
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
      
>>>>>>> fix/question-data-issue
      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#131309] text-xl">
            {players.length} {players.length === 1 ? 'jugador' : 'jugadores'} en la partida
          </p>
          <button 
            className="text-[#131309] hover:text-[#131309]/70 transition-colors"
            onClick={handleShare}
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

<<<<<<< HEAD
        {/* Mensaje condicional basado en si es el primer jugador o no */}
        {players.length > 0 && currentPlayerId === players[0].id ? (
          <div className="bg-[#131309] text-white p-4 rounded-[10px] mb-6">
            <p className="text-center">
              Eres el primer jugador en llegar.
            </p>
            <p className="text-center mt-2">
              Cuando todos los demás hayan llegado, haz click en 'Comenzar Partida'.
            </p>
          </div>
        ) : (
          <div className="bg-[#131309] text-white p-4 rounded-[10px] mb-6">
            <p className="text-center">
              Espera a que se unan todos los jugadores antes de comenzar.
            </p>
          </div>
        )}

=======
>>>>>>> fix/question-data-issue
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
<<<<<<< HEAD

        {/* Banner informativo para jugadores que no son el primero */}
        {players.length > 0 && currentPlayerId !== players[0].id && (
          <div className="border-2 border-[#131309] text-[#131309] p-4 rounded-[10px] mt-6">
            <p className="text-center">
              {players[0]?.name} comenzará la partida cuando estéis todos dentro
            </p>
          </div>
        )}

        {/* Botón de comenzar partida solo visible para el primer jugador */}
        {players.length > 0 && currentPlayerId === players[0].id && (
          <Button
            className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base mt-3"
            onClick={handleStartGame}
            disabled={players.length < 2 || isStartingGame}
          >
            {isStartingGame ? "Iniciando partida..." : 
              players.length < 2 ? "Esperando jugadores..." : "Comenzar partida"}
          </Button>
        )}
      </div>

      {showSnackbar && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#131309] text-white px-4 py-3 rounded-lg shadow-lg z-50">
          Link copiado bro
=======
      </div>

      {/* Panel fijo en la parte inferior solo para el primer jugador */}
      {isFirstPlayer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto space-y-4">
            <p className="text-[#131309] text-center">
              Eres el primero en llegar. Comienza la partida cuando estéis todos aquí.
            </p>
            <Button
              className="w-full h-12 bg-[#cb1517] hover:bg-[#b31315] text-white rounded-[10px] font-bold text-base"
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
>>>>>>> fix/question-data-issue
        </div>
      )}
    </div>
  );
};